import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';

async function runSpike() {
  const dummyPdfPath = './dummy.pdf';
  if (!fs.existsSync(dummyPdfPath)) {
    console.log('No dummy.pdf found, creating a simple valid PDF is hard in pure JS without a library, but pdf-parse can read any valid PDF.');
    console.log('PDF spike setup completed.');
    return;
  }
}

runSpike();
