# PDF Web Editor

A web-based application that allows users to upload PDF documents, edit their content using a rich text editor, and export the modified content back to PDF format while preserving the original layout and formatting.

## Features

- PDF to HTML conversion with layout preservation
- Rich text editing using TinyMCE
- Export back to PDF with formatting intact
- Modern, responsive UI using Tailwind CSS
- File upload with size restrictions
- Secure file handling

## Prerequisites

- Python 3.8 or higher
- pdf2htmlEX
- WeasyPrint

### Installing pdf2htmlEX

#### Windows
1. Download the latest release from [pdf2htmlEX releases](https://github.com/pdf2htmlEX/pdf2htmlEX/releases)
2. Extract the archive and add the bin directory to your system PATH

#### Linux
```bash
sudo apt-get install pdf2htmlEX
```

#### macOS
```bash
brew install pdf2htmlEX
```

### Installing WeasyPrint

#### Windows
```bash
pip install weasyprint
```

#### Linux
```bash
sudo apt-get install python3-cffi python3-brotli libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0
pip install weasyprint
```

#### macOS
```bash
brew install pango
pip install weasyprint
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pdf-web-editor
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install the required Python packages:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the Flask application:
```bash
python app.py
```

2. Open your web browser and navigate to `http://localhost:5000`

3. Upload a PDF file using the file input button

4. Edit the content in the rich text editor

5. Click "Export to PDF" to download the modified document

## Project Structure

```
pdf-web-editor/
├── app.py              # Flask application
├── requirements.txt    # Python dependencies
├── templates/         # HTML templates
│   └── index.html     # Main application template
└── uploads/           # Temporary storage for uploaded files
```

## Notes

- The application has a 16MB file size limit for PDF uploads
- Uploaded files are temporarily stored in the `uploads` directory
- The application uses TinyMCE for rich text editing
- The UI is built with Tailwind CSS for a modern look and feel

## License

MIT License 