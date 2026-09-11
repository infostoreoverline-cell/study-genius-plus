import crypto from 'crypto';

export interface SourceUnit {
  id: string; // page number, slide number, or section
  originalText: string;
  normalizedText: string;
  quality: 'good' | 'ocr_needed' | 'excluded' | 'unknown';
  needsReview: boolean;
  metadata?: any;
}

export interface ParseResult {
  fileHash: string;
  mimeType: string;
  units: SourceUnit[];
  anomalies: string[];
}

export abstract class BaseParser {
  protected calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  protected normalizeText(text: string): string {
    // Basic normalization: trim, collapse spaces
    return text.trim().replace(/\s+/g, ' ');
  }

  protected detectAnomalies(text: string): { quality: SourceUnit['quality'], needsReview: boolean } {
    if (!text || text.trim().length === 0) {
      return { quality: 'unknown', needsReview: true };
    }
    
    // Naive heuristic: if length is very small but we expected a page, or weird chars
    const hasWeirdChars = (text.match(/[^\\x20-\\x7E\\s]/g) || []).length > 3;
    if (hasWeirdChars || text.length < 50) {
      return { quality: 'ocr_needed', needsReview: true };
    }
    
    return { quality: 'good', needsReview: false };
  }

  abstract parse(buffer: Buffer, mimeType: string): Promise<ParseResult>;
}
