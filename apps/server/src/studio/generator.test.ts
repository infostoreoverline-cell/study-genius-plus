import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoSummary, STUDIO_PROFILES } from './generator.js';
import { createStudyPdf } from './pdf.js';
import { createStudyVisuals } from './visuals.js';

test('the local demo creates a structured, source-grounded study document', () => {
  const profile = STUDIO_PROFILES.find((candidate) => candidate.id === 'fisica');
  assert.ok(profile);

  const output = createDemoSummary({
    title: 'Meccanica classica',
    sourceName: 'appunti.txt',
    sourceText: [
      'La forza e una grandezza vettoriale che puo modificare lo stato di moto di un corpo.',
      'Il secondo principio della dinamica collega la forza risultante alla massa e all accelerazione.',
      'Le ipotesi del modello devono essere esplicitate prima di applicare una relazione quantitativa.',
      'Le unita di misura consentono di verificare la coerenza dimensionale dei risultati.',
      'Un sistema di riferimento deve essere dichiarato per interpretare posizione, velocita e accelerazione.'
    ].join(' '),
    profile,
    mode: 'RIASSUNTO'
  });

  assert.match(output, /Modalita demo locale/u);
  assert.match(output, /Concetti chiave emersi dalla fonte/u);
  assert.match(output, /Glossario da consolidare/u);
  assert.match(output, /Domande di ripasso/u);
  assert.match(output, /sistema di riferimento/u);
});

test('visual aids and PDF are generated from the extracted source without unsafe SVG markup', async () => {
  const profile = STUDIO_PROFILES.find((candidate) => candidate.id === 'fisica');
  assert.ok(profile);
  const sourceText = [
    'La forza risultante agisce sul sistema e collega massa e accelerazione.',
    'La forza va analizzata insieme alle ipotesi del modello e alle unità di misura.',
    'L accelerazione e la forza richiedono un sistema di riferimento dichiarato.',
    'Il controllo dimensionale verifica la coerenza delle grandezze fisiche.'
  ].join(' ');
  const visuals = createStudyVisuals({
    title: 'Dinamica',
    sourceName: 'dinamica.txt',
    sourceText,
    profile
  });

  assert.equal(visuals.length, 3);
  assert.deepEqual(visuals.map((visual) => visual.kind), ['concept-map', 'study-flow', 'term-frequency']);
  assert.match(visuals[0].svg, /viewBox="0 0 1080 640"/u);
  assert.match(visuals[2].svg, /Frequenza dei concetti nella fonte/u);
  assert.doesNotMatch(visuals.map((visual) => visual.svg).join('\n'), /<script/iu);

  const pdf = createStudyPdf({
    title: 'Dinamica',
    sourceName: 'dinamica.txt',
    content: createDemoSummary({ title: 'Dinamica', sourceName: 'dinamica.txt', sourceText, profile, mode: 'RIASSUNTO' }),
    visuals
  });
  assert.match(pdf.subarray(0, 8).toString('latin1'), /^%PDF-1.4/u);
  assert.match(pdf.toString('latin1'), /xref/u);

  type PdfTextResult = { text?: unknown };
  type PdfParser = { getText(): Promise<PdfTextResult>; destroy?: () => void | Promise<void> };
  type PdfParserConstructor = new (input: { data: Uint8Array }) => PdfParser;
  type PdfModule = { PDFParse?: PdfParserConstructor };
  const pdfModule = await import('pdf-parse') as unknown as PdfModule;
  assert.ok(pdfModule.PDFParse);
  const parser = new pdfModule.PDFParse({ data: pdf });
  try {
    const extracted = await parser.getText();
    assert.match(String(extracted.text), /Dinamica/u);
  } finally {
    await parser.destroy?.();
  }
});
