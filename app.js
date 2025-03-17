const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const cors = require('cors');

const app = express();
const port = 3001;

// Enable CORS
app.use(cors());

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 16 * 1024 * 1024 // 16MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/images';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const imageUpload = multer({
    storage: imageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const pdfImagesDir = path.join(__dirname, 'public', 'uploads', 'pdf-images');

[uploadsDir, pdfImagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle PDF upload and conversion
app.post('/upload', upload.single('file'), async (req, res) => {
    let filePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        filePath = req.file.path;

        // Read the PDF file
        const dataBuffer = fs.readFileSync(filePath);
        
        // Load the PDF document
        const pdfDoc = await PDFDocument.load(dataBuffer);
        
        // Extract text content
        const data = await pdfParse(dataBuffer);
        
        // Create images directory if it doesn't exist
        const imagesDir = path.join(__dirname, 'public', 'uploads', 'pdf-images');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        // Extract images from PDF
        const images = [];
        for (let i = 0; i < pdfDoc.getPageCount(); i++) {
            const page = pdfDoc.getPage(i);
            
            try {
                // Get all objects from the page
                const pageObjects = await page.node.Resources();
                if (pageObjects) {
                    // Get the XObject dictionary directly
                    const xObjectDict = pageObjects.dict.get('XObject');
                    if (xObjectDict) {
                        const xObject = await xObjectDict.lookup();
                        if (xObject) {
                            // Get all objects from XObject dictionary
                            const objects = await xObject.dict.toObject();
                            for (const [name, obj] of Object.entries(objects)) {
                                try {
                                    // Check if object is an image
                                    if (obj && obj.constructor.name === 'PDFStream') {
                                        const subtype = await obj.dict.lookup('Subtype');
                                        if (subtype && (subtype.value === 'Image' || subtype.value === 'XObject')) {
                                            const imageData = await obj.save();
                                            const imageBuffer = Buffer.from(imageData);
                                            
                                            // Save image to file with unique name
                                            const imageFileName = `pdf-image-${Date.now()}-${i}-${name}.png`;
                                            const imagePath = path.join(imagesDir, imageFileName);
                                            fs.writeFileSync(imagePath, imageBuffer);
                                            
                                            // Get image dimensions
                                            const width = await obj.dict.lookup('Width');
                                            const height = await obj.dict.lookup('Height');
                                            
                                            // Add image to HTML content with proper styling and absolute path
                                            images.push(`
                                                <div class="pdf-image-container" style="margin: 1rem 0; text-align: center;">
                                                    <img 
                                                        src="/uploads/pdf-images/${imageFileName}" 
                                                        alt="PDF Image" 
                                                        style="max-width: 100%; height: auto; display: block; margin: 1rem auto;"
                                                        width="${width ? width.value : 'auto'}"
                                                        height="${height ? height.value : 'auto'}"
                                                    />
                                                </div>
                                            `);
                                        }
                                    }
                                } catch (imgError) {
                                    console.warn(`Warning: Could not process image ${name} on page ${i + 1}:`, imgError.message);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`Warning: Could not extract images from page ${i + 1}:`, error.message);
            }
        }
        
        // Process the text content to preserve structure
        const paragraphs = data.text.split('\n\n').filter(p => p.trim());
        
        // Convert paragraphs to HTML with better formatting
        const htmlContent = `
            <div class="pdf-content" style="font-weight: normal !important;">
                ${paragraphs.map(paragraph => {
                    // Split into lines and preserve line breaks
                    const lines = paragraph.split('\n');
                    let currentTable = [];
                    let html = '';
                    let inTable = false;
                    
                    lines.forEach(line => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) {
                            if (inTable) {
                                // End of table
                                html += '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">';
                                currentTable.forEach((row, rowIndex) => {
                                    html += '<tr>';
                                    row.forEach((cell, cellIndex) => {
                                        const tag = rowIndex === 0 ? 'th' : 'td';
                                        html += `<${tag} style="border: 1px solid #ddd; padding: 8px; font-weight: normal !important;">${cell}</${tag}>`;
                                    });
                                    html += '</tr>';
                                });
                                html += '</table>';
                                currentTable = [];
                                inTable = false;
                            }
                            return;
                        }
                        
                        // Check if line might be a table row (contains multiple spaces or tabs)
                        if (trimmedLine.match(/\s{2,}|\t/)) {
                            const cells = trimmedLine.split(/\s{2,}|\t/).filter(cell => cell.trim());
                            if (cells.length > 1) {
                                currentTable.push(cells);
                                inTable = true;
                            } else if (inTable) {
                                // End of table
                                html += '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">';
                                currentTable.forEach((row, rowIndex) => {
                                    html += '<tr>';
                                    row.forEach((cell, cellIndex) => {
                                        const tag = rowIndex === 0 ? 'th' : 'td';
                                        html += `<${tag} style="border: 1px solid #ddd; padding: 8px; font-weight: normal !important;">${cell}</${tag}>`;
                                    });
                                    html += '</tr>';
                                });
                                html += '</table>';
                                currentTable = [];
                                inTable = false;
                                html += `<p style="font-weight: normal !important;">${trimmedLine}</p>`;
                            } else {
                                html += `<p style="font-weight: normal !important;">${trimmedLine}</p>`;
                            }
                        } else if (inTable) {
                            // End of table
                            html += '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">';
                            currentTable.forEach((row, rowIndex) => {
                                html += '<tr>';
                                row.forEach((cell, cellIndex) => {
                                    const tag = rowIndex === 0 ? 'th' : 'td';
                                    html += `<${tag} style="border: 1px solid #ddd; padding: 8px; font-weight: normal !important;">${cell}</${tag}>`;
                                });
                                html += '</tr>';
                            });
                            html += '</table>';
                            currentTable = [];
                            inTable = false;
                            html += `<p style="font-weight: normal !important;">${trimmedLine}</p>`;
                        } else {
                            html += `<p style="font-weight: normal !important;">${trimmedLine}</p>`;
                        }
                    });
                    
                    // Close any open table
                    if (inTable && currentTable.length > 0) {
                        html += '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">';
                        currentTable.forEach((row, rowIndex) => {
                            html += '<tr>';
                            row.forEach((cell, cellIndex) => {
                                const tag = rowIndex === 0 ? 'th' : 'td';
                                html += `<${tag} style="border: 1px solid #ddd; padding: 8px; font-weight: normal !important;">${cell}</${tag}>`;
                            });
                            html += '</tr>';
                        });
                        html += '</table>';
                    }
                    
                    return html;
                }).join('')}
                ${images.join('')}
            </div>
        `;

        // Log the HTML content for debugging
        console.log('Generated HTML content:', htmlContent);

        res.json({
            success: true,
            html_content: htmlContent
        });
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error processing PDF file: ' + error.message 
        });
    } finally {
        // Clean up the uploaded file
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.error('Error deleting temporary file:', error);
            }
        }
    }
});

// Handle image uploads
app.post('/upload-image', imageUpload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Ensure the upload directory exists
        const uploadDir = path.dirname(req.file.path);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const imageUrl = `/uploads/images/${req.file.filename}`;
        res.json({ location: imageUrl });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Error uploading image: ' + error.message });
    }
});

// Handle PDF export
app.post('/export', async (req, res) => {
    let browser = null;
    try {
        const { html_content, title } = req.body;
        
        if (!html_content) {
            throw new Error('No content provided for export');
        }

        // Create a temporary HTML file with proper styling
        const tempHtmlPath = path.join(__dirname, 'uploads', `temp-${Date.now()}.html`);
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        padding: 20px;
                        margin: 0;
                        color: #333;
                        font-weight: normal !important;
                    }
                    .pdf-content {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    p, h1, h2, h3, h4, h5, h6, li, td, th {
                        font-weight: normal !important;
                    }
                    p {
                        margin-bottom: 1rem;
                        text-align: justify;
                    }
                    h2 {
                        color: #2c3e50;
                        margin-top: 1.5rem;
                        margin-bottom: 1rem;
                        font-size: 1.5rem;
                    }
                    .tinymce-content {
                        padding: 20px;
                        background: white;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        margin: 1rem 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 1rem 0;
                    }
                    table td, table th {
                        border: 1px solid #ddd;
                        padding: 8px;
                    }
                    table tr:nth-child(even) {
                        background-color: #f9fafb;
                    }
                </style>
            </head>
            <body>
                <div class="tinymce-content">
                    ${html_content}
                </div>
            </body>
            </html>
        `;
        fs.writeFileSync(tempHtmlPath, fullHtml);

        // Launch Puppeteer with specific options
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Load the HTML content
        await page.goto(`file://${tempHtmlPath}`);

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        // Clean up temporary file
        fs.unlinkSync(tempHtmlPath);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${title || 'document'}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send the PDF
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error generating PDF: ' + error.message 
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});