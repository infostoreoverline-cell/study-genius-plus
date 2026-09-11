import { chromium } from 'playwright';
import fs from 'fs';

async function runSpike() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head><title>Test PDF</title></head>
      <body>
        <h1>Hello Playwright</h1>
        <svg width="100" height="100">
          <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
        </svg>
      </body>
    </html>
  `);
  
  await page.pdf({ path: 'test_output.pdf', format: 'A4' });
  console.log('PDF generated at test_output.pdf');
  
  await browser.close();
}

runSpike().catch(console.error);
