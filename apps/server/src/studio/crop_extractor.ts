import { chromium } from 'playwright';
import fs from 'node:fs/promises';

export async function extractCropFromPdf(pdfPath: string, pageNumber: number, boundingBox: [number, number, number, number]): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const pdfBuffer = await fs.readFile(pdfPath);

  // We route a fake URL to serve the PDF buffer
  await page.route('http://local/document.pdf', route => {
    route.fulfill({
      contentType: 'application/pdf',
      body: pdfBuffer,
    });
  });

  // A simple HTML page that uses pdf.js to render the PDF page to a canvas
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <style>
        body, html { margin: 0; padding: 0; background: white; }
        canvas { display: block; }
      </style>
    </head>
    <body>
      <canvas id="pdf-canvas"></canvas>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        async function renderPage() {
          const loadingTask = pdfjsLib.getDocument('http://local/document.pdf');
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(${pageNumber});
          
          const scale = 2; // high res
          const viewport = page.getViewport({ scale });
          
          const canvas = document.getElementById('pdf-canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          await page.render(renderContext).promise;
          
          window.pdfRendered = true;
          window.pdfWidth = viewport.width;
          window.pdfHeight = viewport.height;
        }
        
        renderPage().catch(console.error);
      </script>
    </body>
    </html>
  `;

  await page.route('http://local/index.html', route => {
    route.fulfill({
      contentType: 'text/html',
      body: html,
    });
  });

  await page.goto('http://local/index.html');
  await page.waitForFunction(() => (window as any).pdfRendered === true);

  const pdfWidth = await page.evaluate(() => (window as any).pdfWidth as number);
  const pdfHeight = await page.evaluate(() => (window as any).pdfHeight as number);

  const [ymin, xmin, ymax, xmax] = boundingBox;
  
  // Calculate crop coordinates
  const x = Math.max(0, xmin * pdfWidth);
  const y = Math.max(0, ymin * pdfHeight);
  const width = Math.min(pdfWidth - x, (xmax - xmin) * pdfWidth);
  const height = Math.min(pdfHeight - y, (ymax - ymin) * pdfHeight);

  const screenshot = await page.locator('canvas').screenshot({
    clip: { x, y, width, height }
  });

  await browser.close();
  return screenshot;
}
