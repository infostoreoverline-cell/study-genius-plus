import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownExporter } from '../src/export/markdown.js';
import { LatexExporter } from '../src/export/latex.js';
import { PdfQaChecker } from '../src/export/pdf_qa.js';
import { DocumentAST } from '../../contracts/src/index.js';

describe('Export M12 Tests', () => {
  const doc: DocumentAST = {
    id: 'doc_test',
    type: 'document',
    title: 'Teoria dei Segnali & Sistemi',
    hash: 'hash123',
    sourceRefs: [],
    symbols: [],
    chapters: [
      {
        id: 'ch1',
        type: 'chapter',
        title: 'Introduzione',
        hash: 'h1',
        sourceRefs: [],
        content: [
          {
            id: 'p1',
            type: 'paragraph',
            content: 'Il segnale è una funzione 100% reale.',
            hash: 'p1_h',
            sourceRefs: []
          },
          {
            id: 'f1',
            type: 'formula',
            latex: 'x(t) = \\sin(2\\pi f t)',
            isBlock: true,
            hash: 'f1_h',
            sourceRefs: [],
            symbols: []
          },
          {
            id: 'fig1',
            type: 'figure_ref',
            figureId: 'fig_sin',
            caption: 'Onda sinusoidale',
            hash: 'fig1_h',
            sourceRefs: []
          }
        ]
      }
    ]
  };

  it('MarkdownExporter should generate required zip files', () => {
    const exporter = new MarkdownExporter();
    const result = exporter.export(doc);
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('markdown_zip');
    
    const filenames = result.files.map(f => f.filename);
    expect(filenames).toContain('document.md');
    expect(filenames).toContain('fonti.md');
    expect(filenames).toContain('verifiche.md');
    expect(filenames).toContain('LEGGIMI.md');
    expect(filenames).toContain('manifest.json');
    
    const docMd = result.files.find(f => f.filename === 'document.md')!;
    expect(docMd.content).toContain('$$ x(t) = \\sin(2\\pi f t) $$');
    expect(docMd.content).toContain('![Onda sinusoidale](assets/fig_sin.svg)');
  });

  it('LatexExporter should escape text properly but leave formula alone', () => {
    const exporter = new LatexExporter();
    const result = exporter.export(doc);
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('latex');
    
    const tex = result.files[0].content;
    // Check title escape
    expect(tex).toContain('\\title{Teoria dei Segnali \\& Sistemi}');
    // Check paragraph escape
    expect(tex).toContain('100\\% reale');
    // Check block formula unescaped
    expect(tex).toContain('\\begin{equation*}');
    expect(tex).toContain('x(t) = \\sin(2\\pi f t)');
    // Check figure inclusion
    expect(tex).toContain('\\includegraphics{assets/fig_sin.pdf}');
  });

  it('PdfQaChecker should detect overflows in mock', () => {
    const qa = new PdfQaChecker();
    
    const docPass = { ...doc };
    const passResult = qa.check(docPass);
    expect(passResult.passed).toBe(true);
    expect(passResult.findings.length).toBe(0);

    const docFail = { ...doc, title: 'Test FAIL_PDF Document' };
    const failResult = qa.check(docFail);
    expect(failResult.passed).toBe(false);
    expect(failResult.findings[0].issue).toBe('overflow');
  });
});
