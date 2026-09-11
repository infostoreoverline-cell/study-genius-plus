import pdf from 'pdf-parse';
import { BaseParser, ParseResult, SourceUnit } from './parser.js';

export class PdfParser extends BaseParser {
  async parse(buffer: Buffer, mimeType: string): Promise<ParseResult> {
    if (mimeType !== 'application/pdf') {
      throw new Error(`Unsupported mimeType for PdfParser: ${mimeType}`);
    }

    const fileHash = this.calculateHash(buffer);
    const anomalies: string[] = [];
    const units: SourceUnit[] = [];

    let currentPage = 1;
    let pageTextBuffer = '';

    // Custom render page function to capture page by page
    const render_page = async (pageData: any) => {
      const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      const textContent = await pageData.getTextContent(render_options);
      let lastY, text = '';
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY){
            text += item.str;
        } else {
            text += '\n' + item.str;
        }    
        lastY = item.transform[5];
      }

      const originalText = text;
      const normalizedText = this.normalizeText(text);
      const detection = this.detectAnomalies(normalizedText);

      if (detection.needsReview) {
        anomalies.push(`Page ${currentPage} might need OCR or review.`);
      }

      units.push({
        id: `page_${currentPage}`,
        originalText,
        normalizedText,
        quality: detection.quality,
        needsReview: detection.needsReview
      });

      currentPage++;
      return text;
    };

    try {
      await pdf(buffer, { pagerender: render_page });
    } catch (err: any) {
      anomalies.push(`Fatal error parsing PDF: ${err.message}`);
    }

    return {
      fileHash,
      mimeType,
      units,
      anomalies
    };
  }
}
