import * as pdfParseModule from 'pdf-parse';
import { BaseParser, type ParseResult, type SourceUnit } from './parser.js';

const pdf = (pdfParseModule as any).default || pdfParseModule;

export class PdfParser extends BaseParser {
  async parse(buffer: Buffer, mimeType: string): Promise<ParseResult> {
    if (mimeType !== 'application/pdf') {
      throw new Error(`Unsupported mimeType for PdfParser: ${mimeType}`);
    }

    const fileHash = this.calculateHash(buffer);
    const anomalies: string[] = [];
    const units: SourceUnit[] = [];

    let currentPage = 1;
    let fullText = '';

    const render_page = async (pageData: any) => {
      const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      const textContent = await pageData.getTextContent(render_options);
      let lastY, text = '';
      let pageEmpty = true;
      
      for (let item of textContent.items) {
        pageEmpty = false;
        // Fix per font matematici comuni o simboli greci
        let str = item.str;
        if (str.includes('\uF02D')) str = str.replace(/\uF02D/g, '-');
        
        if (lastY == item.transform[5] || !lastY){
            text += str;
        } else {
            text += '\n' + str;
        }    
        lastY = item.transform[5];
      }

      // Rilevamento OCR
      if (pageEmpty || text.trim().length < 50) {
        anomalies.push(`Pagina ${currentPage} potrebbe richiedere OCR (troppo poco testo).`);
      }

      // Pulizia base per intestazioni e piè di pagina ripetuti (naive)
      const lines = text.split('\n');
      if (lines.length > 5) {
        if (/^\s*\d+\s*$/.test(lines[0]) || /^\s*Pagina \d+/.test(lines[0])) lines.shift();
        if (/^\s*\d+\s*$/.test(lines[lines.length - 1])) lines.pop();
      }
      text = lines.join('\n');
      
      // Fix testo spezzato: unisci righe che non terminano con punteggiatura
      text = text.replace(/([^\.\!\?\:\;])\n([a-z])/g, '$1 $2');

      const originalText = text;
      // Prepend page marker per il contesto AI
      const pageMarkedText = `[Pagina ${currentPage}]\n${text}`;
      
      const normalizedText = this.normalizeText(pageMarkedText);
      const detection = this.detectAnomalies(normalizedText);

      units.push({
        id: `page_${currentPage}`,
        originalText,
        normalizedText,
        quality: detection.quality,
        needsReview: detection.needsReview
      });

      fullText += pageMarkedText + '\n\n';
      currentPage++;
      return pageMarkedText;
    };

    try {
      await pdf(buffer, { pagerender: render_page });
    } catch (err: any) {
      anomalies.push(`Errore fatale parsing PDF: ${err.message}`);
    }

    if (fullText.trim().length < 100) {
      anomalies.push('Il documento intero sembra richiedere OCR (solo immagini o scansioni).');
    }

    return {
      fileHash,
      mimeType,
      units,
      anomalies
    };
  }
}
