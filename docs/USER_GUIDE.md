# Study Genius+ : Guida Utente

Benvenuto in **Study Genius+**, il tuo compagno per riassumere, analizzare e studiare documenti in modo strutturato e con costi controllati.

## 1. Installazione e Avvio
- **Prerequisiti**: Node.js 24 LTS installato sul sistema.
- **Installazione**: Apri il terminale nella cartella del progetto ed esegui `npm install`.
- **Avvio**: Esegui `npm run start`. L'app locale si avvierà su `http://localhost:3000`.

## 2. Inserimento delle chiavi API
Per utilizzare i modelli di intelligenza artificiale, hai bisogno delle chiavi API fornite da **Google (Gemini)** o **DeepSeek**.
1. Vai nella sezione **Impostazioni** dell'app.
2. Inserisci le tue chiavi. Il sistema le encripterà in locale con DPAPI (solo il tuo PC può leggerle).
3. Le chiamate non partiranno finché non avrai definito un budget (di default massimo 3€ ad operazione).

## 3. Flusso di Lavoro (Creare un Riassunto)
1. Clicca su **Nuovo Lavoro**.
2. **Importazione Fonti**: Carica PDF, DOCX, o PPTX. Il sistema processerà (se necessario con OCR remoto) i contenuti.
3. **Imposta il Profilo**: Scegli la materia (Fisica, Matematica, ecc.) e il Profilo Economico (Economico, Bilanciato, Qualità) per definire che modelli verranno usati.
4. **Conferma il Budget**: Il sistema ti presenterà una spesa massima garantita (Ledger Atomico). Approvala per procedere.
5. **Generazione e Revisione**: Il sistema creerà l'AST Documentale. Puoi correggere specifiche frasi o rigenerare formule e SVG tramite il workflow di **Repair**.

## 4. Download ed Esportazione
Una volta completato, usa la funzione **Esporta** per ottenere un pacchetto offline contenente:
- PDF leggibile
- Documento Markdown
- Sorgente LaTeX e immagini SVG

## 5. Manutenzione
Dal menu impostazioni puoi generare un file `.sgpbak` criptato che funge da Backup di tutti i tuoi progetti e configurazioni. Ripristina i backup usando la funzione "Restore".
