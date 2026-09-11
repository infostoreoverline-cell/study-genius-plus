# Handoff per Google Antigravity

## Stato consegnato

Il branch `codex/usable-mvp` contiene una prima vertical slice utilizzabile:

1. Progetto di studio.
2. Upload PDF/TXT/Markdown.
3. Estrazione testo e archiviazione locale SQLite.
4. Riassunto in demo locale oppure via Gemini/DeepSeek configurato dall'utente.
5. Lettura, copia, download Markdown e archivio.

Il percorso da preservare e `apps/web` -> `apps/server` -> SQLite nella cartella `.study-genius`. L'app e volutamente local-first e l'API ascolta solo su loopback.

## Avvio e verifica

```bash
npm ci
npm run dev:server
# in un secondo terminale
npm run dev:web
```

Aprire `http://localhost:5173`. La verifica disponibile e:

```bash
npm run verify
```

I comandi e il comportamento utente sono descritti anche nel README principale.

## File principali

| Area | File |
| --- | --- |
| Frontend React | `apps/web/src/App.tsx` |
| Stile dell'interfaccia | `apps/web/src/App.css` |
| API MVP | `apps/server/src/http/routes/studio.ts` |
| Generazione demo e provider AI | `apps/server/src/studio/generator.ts` |
| Avvio locale e caricamento `.env` | `apps/server/src/index.ts` |
| Persistenza output | `packages/storage/src/migrations/003_studio_outputs.sql` |

## Vincoli importanti

- Non salvare API key nel database, nei log o nel frontend. L'input in Impostazioni e solo in RAM; le chiavi permanenti stanno in `.env`, ignorato da Git.
- Non esporre il server sulla rete senza aggiungere autenticazione e un modello di sicurezza adeguato.
- Non sostituire il flusso demo: deve restare funzionante anche senza chiavi API.
- Mantieni la compatibilita con Node.js 22.3+ per `pdf-parse` 2.x.
- Gli output AI devono dichiarare in modo chiaro lacune e non inventare informazioni assenti dalla fonte.

## Cose ancora da completare, in ordine consigliato

1. Aggiungere OCR locale o guidato per PDF scansiti e visualizzare le pagine problematiche.
2. Aggiungere citazioni pagina/paragrafo nel riassunto e una revisione manuale delle fonti.
3. Trasformare l'output in una dispensa completa: capitoli, esercizi, flashcard e quiz.
4. Integrare figure/SVG solamente dopo avere un flusso di approvazione e rigenerazione per ogni figura.
5. Aggiungere test E2E reali (upload di un TXT e generazione demo), oltre alla build attuale.
6. Solo se serve la condivisione, progettare autenticazione, utenti e storage remoto separatamente dal flusso locale.

## Prompt pronto per Antigravity

```text
Continua il progetto StudyGenius+ partendo dal branch codex/usable-mvp. Leggi prima README.md e HANDOFF_ANTIGRAVITY.md. Non eliminare o sostituire il flusso locale gia funzionante: progetto -> upload PDF/TXT/MD -> riassunto demo -> archivio/download Markdown. Mantieni API e dati solo su loopback e non salvare API key nel database o nel repository.

Prima esegui npm ci e npm run verify. Poi implementa il prossimo miglioramento: OCR per PDF scansiti con una UI che indichi chiaramente quali pagine richiedono revisione. Aggiungi una verifica reale del flusso (almeno con TXT) e aggiorna README.md e questo handoff con comandi, stato e limiti. Non introdurre servizi a pagamento o deployment esterni senza chiedere esplicitamente all'utente.
```
