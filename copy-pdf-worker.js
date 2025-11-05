const fs = require('fs');
const path = require('path');

// Source: node_modules
const workerSrc = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');

// Destination: public folder
const publicDir = path.join(__dirname, 'public', 'pdf-worker');
const workerDest = path.join(publicDir, 'pdf.worker.min.mjs');

// Create public/pdf-worker directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy worker file
try {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('✅ PDF.js worker copied to public folder');
} catch (error) {
  console.error('❌ Failed to copy PDF.js worker:', error.message);
  process.exit(1);
}

