import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoSummary, STUDIO_PROFILES } from './generator.js';

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
