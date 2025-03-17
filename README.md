PDF Web Editor

A web-based application that allows users to upload PDF documents, edit their content using a rich text editor, and export the modified content back to PDF format while preserving the original layout and formatting.

Features

PDF to HTML conversion with layout preservation

Rich text editing using TinyMCE

Export back to PDF with formatting intact

Modern, responsive UI using Tailwind CSS

File upload with size restrictions

Secure file handling

Prerequisites:

Node.js 14 or higher

pdf.js (pdfjs-dist)

wkhtmltopdf

Installing pdf.js (pdfjs-dist)

Install pdf.js via npm:

npm install pdfjs-dist

Installing wkhtmltopdf

Windows

Download the latest release from wkhtmltopdf official site

Install and add it to the system PATH

Linux

sudo apt-get install wkhtmltopdf

macOS

brew install wkhtmltopdf

Installation

Clone the repository:

git clone <repository-url>
cd pdf-web-editor

Install the required Node.js packages:

npm install

Usage

Start the Node.js application:

node app.js

Open your web browser and navigate to http://localhost:3001

Upload a PDF file using the file input button

Edit the content in the rich text editor

Click "Export to PDF" to download the modified document

Project Structure

pdf-web-editor/
├── node_modules/       # Installed dependencies
├── public/            # Static files (CSS, JS, images, etc.)
│   ├── upload image   # (Image file for UI)
│   ├── index.html     # Main HTML file
├── uploads/           # Temporary storage for uploaded files
├── app.js             # Node.js application
├── package.json       # Project dependencies
├── package-lock.json  # Dependency lock file

Notes

The application has a 16MB file size limit for PDF uploads

Uploaded files are temporarily stored in the uploads directory

The application uses TinyMCE for rich text editing

The UI is built with Tailwind CSS for a modern look and feel

