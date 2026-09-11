# Study Genius+ : Guida per Sviluppatori

Questa repository rappresenta l'implementazione "v2" ricostruita per **Google Antigravity**, basata sui design document in `docs/implementation/`.

## Architettura e Monorepo
Il progetto è strutturato come Monorepo tramite npm workspaces.
```
- apps/
  - server/      (API locale Express.js e integrazioni SQLite)
- packages/
  - budget/      (Ledger economico in microEUR)
  - contracts/   (Schemi e modelli di dominio condivisi)
  - didactic/    (Ast, Documenti, Modalità Generazione)
  - evals/       (Valutazione qualità e configurazione Prezzi)
  - ingestion/   (Import PDF/PPTX e OCR)
  - maintenance/ (Backup, Restore)
  - providers/   (Integrazione AI DeepSeek e Google Gemini)
  - storage/     (Integrazione DB Better-sqlite3 e blob store locale)
  - visual/      (Generazione SVG e renderizzazioni)
```

## Strumenti
- **Node.js**: `24 LTS`
- **Testing**: `vitest`
- **Database**: `better-sqlite3` per performance asincrone, locale al filesystem Windows.

## Esecuzione dei Test (M15)
- `npm run test:unit`: Avvia tutta la test suite (oltre 40 test).
- `npm run test:integration`: Avvia i test sul database locale (migrations, concurrency).
- `npm run verify`: Esegue la Type Check e la suite di Unit test simultaneamente per i passaggi di CI.

## Prezzi e Modelli
Il catalogo dei modelli non si affida alle SDK statiche ma a un file `packages/evals/src/pricing.ts`. Qualora Google o DeepSeek cambino i costi:
1. Apri `pricing.ts` e aggiungi un nuovo entry con la data `validFrom` appropriata.
2. Il sistema userà sempre la tariffa attiva al momento della richiesta, calcolando i costi in base a conversion rate standard `EUR/USD` ed `EUR/CNY`.

## Aggiunta di nuovi provider
1. Scrivi un nuovo adapter in `packages/providers` seguendo l'interfaccia `ProviderAdapter` definita in `packages/contracts/src/providers.ts`.
2. Aggiungi i prezzi al catalogo in `evals/src/pricing.ts`.
3. Registra l'adapter all'interno del factory nel server (`apps/server/src/index.ts`).
