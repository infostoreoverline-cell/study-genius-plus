# ADR 01: Stack Applicativo

## Contesto
Occorre definire lo stack tecnologico per il monolite modulare, garantendo solidità e compatibilità su Windows senza dipendenze native fragili.

## Decisione
- **Runtime**: Node.js 24 LTS (patch v24.x)
- **Linguaggio**: TypeScript con `strict: true`.
- **Backend**: Express 5.
- **Database**: SQLite tramite `better-sqlite3`.
- **Gestore pacchetti**: npm con lockfile.

## Conseguenze
L'uso di `better-sqlite3` richiede la compilazione o il download di binari pre-buildati, ma i test hanno confermato che funziona correttamente su Windows x64.
