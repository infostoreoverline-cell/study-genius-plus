import { describe, it, expect } from 'vitest';
import { PdfParser } from '../src/pdf_parser.js';

describe('PdfParser', () => {
  it('should initialize successfully', () => {
    const parser = new PdfParser();
    expect(parser).toBeTruthy();
  });
});
