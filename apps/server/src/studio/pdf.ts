import { chromium } from 'playwright';
import type { StudyVisual } from './visuals.js';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';

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

marked.use(markedKatex({ throwOnError: false }));

export async function createStudyPdf(input: MasterPdfInput): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    
    let allHtmlContent = '';

    for (let i = 0; i < input.chapters.length; i++) {
      const chapter = input.chapters[i];
      let htmlContent = await marked.parse(chapter.content);

      let visualsHtml = '';
      if (chapter.visuals.length > 0) {
        visualsHtml += '<h2>Figure e grafici</h2><div style="display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem;">';
        for (const visual of chapter.visuals) {
          visualsHtml += `
            <div style="page-break-inside: avoid; border: 1px solid #ccc; padding: 1rem; border-radius: 8px;">
              <h3>${visual.title}</h3>
              ${visual.svg ? `<div style="display:flex; justify-content:center; margin: 1rem 0;">${visual.svg}</div>` : ''}
              <p style="font-style: italic; color: #555;">${visual.caption}</p>
            </div>
          `;
        }
        visualsHtml += '</div>';
      }

      allHtmlContent += `
        <div class="chapter" style="${i > 0 ? 'page-break-before: always;' : ''}">
          <div class="header">
            <h1>${chapter.title}</h1>
            <div class="source">Fonte: ${chapter.sourceName}</div>
          </div>
          <div class="content">
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
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+O+04/44aWe80d8OdZ" crossorigin="anonymous">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
          }
          h1, h2, h3 {
            color: #1a1a1a;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          p { margin-bottom: 1em; }
          .header {
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
          }
          .source {
            color: #666;
            font-size: 0.9em;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5rem 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th { background-color: #f5f5f5; }
          blockquote {
            border-left: 4px solid #ccc;
            margin: 1.5em 0;
            padding: 0.5em 1em;
            color: #666;
            background: #f9f9f9;
          }
          code {
            background-color: #f4f4f4;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="master-header" style="text-align: center; margin-bottom: 4rem;">
          <h1 style="font-size: 3em; margin-bottom: 0.5em;">${input.title}</h1>
          <p style="font-size: 1.5em; color: #666;">Dispensa di studio unificata</p>
        </div>
        ${allHtmlContent}
      </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });
    
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
