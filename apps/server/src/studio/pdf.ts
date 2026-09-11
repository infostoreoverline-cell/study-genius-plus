import { chromium } from 'playwright';
import { marked } from 'marked';
import katex from 'katex';
import type { StudyVisual } from './visuals.js';

export interface StudyChapter {
  title: string;
  sourceName: string;
  content: string;
  visuals: Array<Pick<StudyVisual, 'title' | 'caption' | 'svg'>>;
}

export interface MasterPdfInput {
  title: string;
  chapters: StudyChapter[];
}

function processMarkdown(text: string): string {
  // 1. Process block math $$...$$
  let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
    try {
      return `<div class="math-display">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) {
      return match;
    }
  });

  // 2. Process inline math $...$ (making sure not to match empty $$ or across newlines if not necessary, though we just use non-greedy)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
    try {
      return `<span class="math-inline">${katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })}</span>`;
    } catch (e) {
      return match;
    }
  });

  return processed;
}

export async function createStudyPdf(input: MasterPdfInput): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    
    let allHtmlContent = '';

    for (let i = 0; i < input.chapters.length; i++) {
      const chapter = input.chapters[i];
      
      // Replace custom blocks like > **Definizione** with standard divs before marked
      let preProcessed = chapter.content
        .replace(/> \*\*Definizione\*\*:(.+?)(?=\n\n|\n>|$)/gs, '<div class="box definition"><strong>Definizione:</strong>$1</div>\n\n')
        .replace(/> \*\*Esempio\*\*:(.+?)(?=\n\n|\n>|$)/gs, '<div class="box example"><strong>Esempio:</strong>$1</div>\n\n');

      preProcessed = processMarkdown(preProcessed);
      let htmlContent = await marked.parse(preProcessed, { async: true });

      let visualsHtml = '';
      if (chapter.visuals.length > 0) {
        visualsHtml += '<h2 class="visuals-title">Figure e Grafici Originali</h2><div class="visuals-container">';
        for (const visual of chapter.visuals) {
          visualsHtml += `
            <div class="visual-card">
              <h3 class="visual-card-title">${visual.title}</h3>
              ${visual.svg ? `<div class="visual-svg-container">${visual.svg}</div>` : ''}
              <p class="visual-caption">${visual.caption}</p>
            </div>
          `;
        }
        visualsHtml += '</div>';
      }

      allHtmlContent += `
        <div class="chapter">
          <div class="chapter-header">
            <div class="source-pill">Fonte: ${chapter.sourceName}</div>
            <h1>${chapter.title}</h1>
          </div>
          <div class="chapter-content">
            ${htmlContent}
          </div>
          ${visualsHtml}
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>${input.title}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
        <style>
          @page {
            size: A4;
            margin: 25mm 20mm;
            @bottom-center {
              content: counter(page);
              font-family: 'Georgia', serif;
              font-size: 10pt;
              color: #666;
            }
            @top-right {
              content: string(chapter-title);
              font-family: 'Georgia', serif;
              font-size: 9pt;
              color: #999;
            }
          }

          body {
            /* No monospace for standard text! */
            font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #111;
            margin: 0;
            padding: 0;
            background: #fff;
          }

          h1, h2, h3, h4, h5 {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            color: #000;
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          h1 { font-size: 24pt; margin-bottom: 1.5rem; border-bottom: 2px solid #000; padding-bottom: 0.2rem; string-set: chapter-title content(); }
          h2 { font-size: 16pt; margin-top: 2rem; color: #222; }
          h3 { font-size: 13pt; margin-top: 1.5rem; color: #333; }

          p {
            margin-bottom: 1em;
            text-align: justify;
            hyphens: auto;
          }

          .master-cover {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
          }

          .master-cover h1 {
            font-size: 42pt;
            border: none;
            margin-bottom: 0.5rem;
          }

          .master-cover p {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 16pt;
            color: #555;
          }

          .chapter {
            page-break-before: always;
          }

          .chapter-header {
            margin-bottom: 2rem;
            padding-top: 1rem;
          }

          .source-pill {
            display: inline-block;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            background: #f0f0f0;
            color: #444;
            padding: 0.2rem 0.6rem;
            font-size: 9pt;
            border-radius: 4px;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .box {
            border-left: 4px solid;
            padding: 1rem;
            margin: 1.5rem 0;
            border-radius: 0 4px 4px 0;
            page-break-inside: avoid;
          }
          
          .box.definition {
            background-color: #f8faff;
            border-color: #4a80db;
          }
          
          .box.example {
            background-color: #fdfaf5;
            border-color: #e5a439;
          }

          .box strong {
            display: block;
            margin-bottom: 0.5rem;
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin: 2rem 0;
            page-break-inside: avoid;
            font-size: 10pt;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          
          th { 
            background-color: #f4f4f4; 
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          }

          blockquote {
            border-left: 3px solid #ccc;
            margin: 1.5rem 0;
            padding: 0.5rem 1rem;
            color: #555;
            font-style: italic;
          }

          .math-display {
            margin: 1.5rem 0;
            text-align: center;
            overflow-x: auto;
            page-break-inside: avoid;
          }

          .visuals-title {
            margin-top: 3rem;
            border-top: 1px solid #eee;
            padding-top: 2rem;
          }

          .visuals-container {
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }

          .visual-card {
            page-break-inside: avoid;
            border: 1px solid #ddd;
            padding: 1.5rem;
            border-radius: 8px;
            background: #fafafa;
          }

          .visual-card-title {
            margin-top: 0;
            font-size: 12pt;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.5rem;
          }

          .visual-svg-container {
            display: flex;
            justify-content: center;
            margin: 1.5rem 0;
            background: #fff;
            padding: 1rem;
            border: 1px solid #eee;
            border-radius: 4px;
          }

          .visual-svg-container svg {
            max-width: 100%;
            height: auto;
          }

          .visual-svg-container img {
            max-width: 100%;
            height: auto;
            max-height: 400px;
            object-fit: contain;
          }

          .visual-caption {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-style: italic;
            color: #666;
            font-size: 9.5pt;
            text-align: center;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="master-cover">
          <h1>${input.title}</h1>
          <p>Dispensa di Studio Unificata</p>
        </div>
        ${allHtmlContent}
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '25mm', right: '20mm', bottom: '25mm', left: '20mm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Handled by @page in CSS for proper sizing usually, or we can use Playwright's header
      footerTemplate: '<div style="font-size: 9px; width: 100%; text-align: center; color: #666;"><span class="pageNumber"></span></div>'
    });
    
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
