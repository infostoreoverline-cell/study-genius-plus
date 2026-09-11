# StudyGenius+

StudyGenius+ e una prima release **local-first** per trasformare un PDF o un file di testo in un riassunto universitario strutturato. I dati, i file caricati e l'archivio rimangono sul computer su cui avvii l'app.

## Cosa e gia utilizzabile

- Creazione di progetti per esame, materia o argomento.
- Caricamento di PDF con testo selezionabile, TXT e Markdown fino a 15 MB.
- Estrazione del testo e segnalazione dei PDF scansiti che richiedono OCR.
- Riassunto locale in modalita demo, senza API key e senza invio del file a servizi esterni.
- Generazione AI opzionale con Google Gemini o DeepSeek.
- Archivio locale di fonti e risultati.
- Lettura, copia e download del riassunto in formato Markdown.

## Requisiti

- Node.js **22.3 o superiore** (`node --version`)
- Git

## Avvio dopo il download della repository

```bash
git clone https://github.com/infostoreoverline-cell/study-genius-plus.git
cd study-genius-plus
npm ci
```

Se l'installazione si ferma su `better-sqlite3` o `node-gyp`, usa una versione Node 22 aggiornata e riprova. Su Windows, se non viene scaricato un binario precompilato, installa anche **Visual Studio Build Tools** con il workload *Desktop development with C++* e Python 3, quindi esegui di nuovo `npm ci`.

Apri poi due terminali nella cartella della repository.

Nel primo avvia il backend:

```bash
npm run dev:server
```

Nel secondo avvia l'interfaccia:

```bash
npm run dev:web
```

Apri [http://localhost:5173](http://localhost:5173). Il server API resta in ascolto solo sul tuo computer, a `127.0.0.1:3000`.

## Primo utilizzo

1. In **Studio**, crea un progetto e scegli il profilo disciplinare.
2. Carica una dispensa PDF con testo selezionabile, oppure un file TXT/Markdown.
3. Seleziona la fonte e premi **Genera in modalita demo**.
4. Leggi il risultato nella colonna di destra oppure scaricalo con **Scarica .md**.
5. Tutti i risultati rimangono disponibili in **Archivio**.

La modalita demo e pensata per rendere l'app utilizzabile subito: costruisce un riepilogo estrattivo, un glossario da consolidare e domande di ripasso a partire dal testo. Per un riassunto piu discorsivo, attiva facoltativamente un provider AI.

## Provider AI facoltativo

Non fornire chiavi API in una chat o in GitHub. Puoi configurarle in uno di questi due modi:

1. Apri **Impostazioni** nell'app e inserisci provider, modello e chiave. La chiave resta solo nella memoria del processo e scompare al riavvio.
2. Copia `.env.example` in `.env`, inserisci una sola chiave e riavvia il backend. Il file `.env` e ignorato da Git.

Esempio:

```bash
cp .env.example .env
```

Su Windows puoi creare manualmente il file `.env` accanto a `package.json` e copiare le stesse variabili. Quando usi l'AI, il testo della fonte viene inviato al provider selezionato; con la modalita demo non viene inviato nulla all'esterno.

## Dove sono salvati i dati

L'app crea la cartella `.study-genius/` nella root della repository. Contiene database SQLite, file caricati e lock del server. E ignorata da Git. Per ricominciare da zero, chiudi prima il backend e rinomina o elimina **solo** quella cartella.

## Verifica tecnica

Dopo `npm ci` puoi verificare il backend MVP e la build frontend con:

```bash
npm run verify
```

## Limiti noti della prima release

- I PDF scansiti senza testo selezionabile richiedono OCR esterno; l'OCR automatico non e ancora incluso.
- L'output pronto e Markdown. Esportazione PDF, diagrammi SVG e modalita di esercizi avanzati sono le prossime evoluzioni.
- La modalita demo non sostituisce il controllo della fonte originale, soprattutto per formule, tabelle e figure.

Per continuare lo sviluppo in Google Antigravity, vedi [HANDOFF_ANTIGRAVITY.md](HANDOFF_ANTIGRAVITY.md).
