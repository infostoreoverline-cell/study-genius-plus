# Recovery Audit: Studio sullo stato reale delle Milestone

A seguito della discrepanza tra il backend API completato e i requisiti end-to-end richiesti dalla Roadmap (M00-M15), questo audit confronta in modo rigoroso le richieste originali contro lo stato dei file, segnalando formalmente lo stato come parziale o bloccato ove manchino l'integrazione con l'interfaccia grafica o i collaudi reali E2E e di type-check.

## M00 — Prove tecniche
- **Requisito Roadmap**: Verificare Stack, SQLite locale, Chromium locale, SDK (Google/Deepseek), DPAPI. Typecheck deve passare.
- **Esistente**: Moduli base inizializzati, prove `tests/spikes/`. Il Typecheck globale (`npm run verify`) fallisce (errore TS1484 in vecchi pacchetti importati).
- **Test Eseguito**: Prove unitarie e test manuale. Manca verifica smoke test E2E.
- **Stato**: **Parziale** (Il typecheck globale deve essere verde).
- **Lavoro Necessario**: Risolvere gli errori TypeScript `verbatimModuleSyntax` nei pacchetti legacy (`packages/visual` ecc.).

## M01 — Dati e contratti
- **Requisito Roadmap**: Database SQLite vuoto, migrazioni, storage.
- **Esistente**: `packages/contracts`, `packages/storage`, SQL migrations.
- **Test Eseguito**: `npm run test` su DB (concorrenza, migrations).
- **Stato**: **Completata**. (I test unitari backend coprono a pieno il requisito).

## M02 — App locale e UI base
- **Requisito Roadmap**: Avvio locale, sessione, UI reale per Archivio, Nuovo lavoro, Workspace, Figure e Impostazioni.
- **Esistente**: Esiste `apps/web/src/App.tsx` ma contiene solo mock in React, non collegati al DB.
- **Test Eseguito**: Placeholder.
- **Stato**: **Bloccata**.
- **Lavoro Necessario**: Implementare l'applicativo React, collegarlo via API/TRPC a `apps/server`, gestire la navigazione e visualizzare dati reali da SQLite.

## M03 — Coda e ripresa
- **Requisito Roadmap**: Coda persistente (Job), Heartbeat, SSE, crash recovery, pausa.
- **Esistente**: Tabella job, logica backend `jobs.test.ts`.
- **Test Eseguito**: Unit test.
- **Stato**: **Parziale**.
- **Lavoro Necessario**: Integrare nel client (React) la gestione della progress bar con eventi Server-Sent Events (SSE) reali emessi da `apps/server`.

## M04 — Budget
- **Requisito Roadmap**: Ledger, micro-EUR, gestione prenotazioni token/API.
- **Esistente**: `packages/budget`.
- **Test Eseguito**: Unit test.
- **Stato**: **Completata**. (Infrastruttura solida lato backend).

## M05 — Chiavi e provider
- **Requisito Roadmap**: UI per inserimento chiavi sicure, salvataggio su DPAPI.
- **Esistente**: Backend `packages/providers` (DPAPI e store). 
- **Test Eseguito**: Test in spike DPAPI. Manca il form UI.
- **Stato**: **Parziale**.
- **Lavoro Necessario**: Creare il form "Impostazioni" nel Frontend in cui l'utente può inserire la chiave. L'endpoint del server la salva su DPAPI.

## M06 — Fonti
- **Requisito Roadmap**: Pannello upload file, parsing PDF/Slides, OCR.
- **Esistente**: `packages/ingestion/src/pdf_parser.ts`.
- **Test Eseguito**: Manca il test E2E.
- **Stato**: **Parziale**.
- **Lavoro Necessario**: Implementare il drag & drop o form file upload nella UI per importare fonti reali, processarle col server e mostrare le estrazioni testuali.

## M07 — Appunti e metodo
- **Requisito Roadmap**: 4 modalità configurabili, piano capitoli da UI.
- **Esistente**: Logica backend didattica in `packages/didactic`.
- **Test Eseguito**: Test isolati sulle logiche interne.
- **Stato**: **Parziale**.
- **Lavoro Necessario**: Form UI di Setup Lavoro dove l'utente seleziona "Teoria", "Riassunto", ecc. e manda il prompt al server per generare il corso persistente.

## M08 — SVG di base & M09 — Figure complete
- **Requisito Roadmap**: Engine per SVG, rendering chimica, fisica, diagrammi di flusso.
- **Esistente**: Implementazioni in `packages/visual`.
- **Test Eseguito**: Test unitari. (Il TypeCheck fallisce a causa degli export in M08/09).
- **Stato**: **Parziale** (Bloccato dal typechecker).
- **Lavoro Necessario**: Patch sui tipi e risoluzione bug TS `verbatimModuleSyntax`.

## M10 — Revisione SVG
- **Requisito Roadmap**: Revisione delle figure *raggiungibile dalla UI*, accettazione manuale o rigetto (Patch Engine).
- **Esistente**: Logica `review_loop.ts` lato backend.
- **Test Eseguito**: Nessun test utente reale.
- **Stato**: **Bloccata**.
- **Lavoro Necessario**: Pagina/Sezione Frontend in cui un utente visiona il rendering SVG e preme "Accetta" o "Rifiuta con Motivo", inviando il feedback al server.

## M11 — Documento ed editor
- **Requisito Roadmap**: Editor per l'assemblaggio finale.
- **Esistente**: Tipi e stub in `didactic`.
- **Test Eseguito**: Manca.
- **Stato**: **Bloccata**.
- **Lavoro Necessario**: Integrare un componente Editor visuale (es. ProseMirror/TipTap) o simile per modificare l'AST.

## M12 — Esportazioni
- **Requisito Roadmap**: PDF, Markdown, LaTeX da scaricare sul PC dell'utente.
- **Esistente**: Codice exporter (Markdown/Latex).
- **Test Eseguito**: Test backend.
- **Stato**: **Parziale**.
- **Lavoro Necessario**: Tasti di "Esporta PDF / MD / LaTeX" nel client Frontend che chiamano gli endpoint per restituire i binari da salvare sul browser (FileSaver).

## M13 — Operatività locale
- **Requisito Roadmap**: Installer, operatività completa offline, backup, cestino.
- **Esistente**: Logiche `packages/maintenance`.
- **Test Eseguito**: Nessuno dalla UI.
- **Stato**: **Parziale**.
- **Lavoro Necessario**: UI Maintenance (Backup manuale e ripristino con drag and drop file di backup).

## M14 — Qualità e prezzi misurati
- **Requisito Roadmap**: Benchmark reale, non simulazioni. Output documentati.
- **Esistente**: I test del benchmark usano simulatori (Mock). 
- **Test Eseguito**: `npm run test` ma virtualizzato.
- **Stato**: **Bloccata**.
- **Lavoro Necessario**: Eseguire script contro vere API e calcolare tariffe e metriche, salvando il report.

## M15 — Rilascio completo
- **Requisito Roadmap**: Test E2E, PC pulito, Browser, zero errori TypeScript, manuali definitivi.
- **Esistente**: Manuali creati, ma TS Typecheck rotto e test E2E mock (`test:e2e`).
- **Test Eseguito**: Test `test:e2e` Playwright attualmente assente/mock.
- **Stato**: **Bloccata**.
- **Lavoro Necessario**: Installare Playwright. Scrivere scenari reali. Passare `npm run verify`. Eseguire collaudo finale tramite GUI.
