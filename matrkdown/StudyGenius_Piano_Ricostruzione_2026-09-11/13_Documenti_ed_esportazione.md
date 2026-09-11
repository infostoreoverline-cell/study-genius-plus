# L — Documenti, anteprima ed esportazione

Dipendenze: 04, 10–12. Output obbligatori: PDF, pacchetto Markdown e sorgenti LaTeX. Il documento canonico è l'AST versionato, con riferimenti a figure e fonti.

## 1. Assemblaggio

L'assembler ordina i capitoli dal piano, risolve simboli, note, citazioni, numerazioni e figure. Non genera nuova teoria. Se trova contraddizioni fra capitoli, crea findings e task mirati nella pipeline, soggetti a budget.

Controllare:

- titoli e sequenza logica;
- definizioni duplicate o discordanti;
- simboli con significati incompatibili;
- esercizi e sottopunti mancanti;
- riferimenti a capitoli, equazioni o figure inesistenti;
- copertura dei requisiti obbligatori;
- figure necessarie senza artifact accettato;
- fonti escluse o illeggibili non dichiarate.

La numerazione è una vista del documento completo: non viene fissata dal modello in ogni capitolo. Gli ID rimangono stabili anche quando cambia il numero di una figura.

## 2. Un renderer HTML comune

Creare componenti di rendering puri per i blocchi AST. L'editor, l'anteprima e il percorso PDF usano gli stessi componenti/document model e le stesse versioni di CSS, font e MathJax. Le differenze consentite riguardano controlli dell'editor e regole di pagina, non contenuti o formule.

Tutti gli asset sono locali. Attendere il caricamento dei font e il completamento esplicito di MathJax prima di misurare o stampare. Le formule non risolte diventano errori identificati, non codice LaTeX visibile dentro il PDF. [Installazione locale MathJax](https://docs.mathjax.org/en/latest/web/hosting.html).

Markdown non passa direttamente a innerHTML. Convertire tramite parser in AST e renderer con allowlist. I blocchi di codice restano testo e non vengono reinterpretati come figure perché contengono la parola svg.

## 3. Impaginazione PDF

Formato iniziale A4, margini 18–20 mm, corpo 10,5–11,5 pt, interlinea leggibile, titoli gerarchici e palette stampabile. I valori sono una baseline da confrontare con le fixture e con le preferenze dell'utente.

Regole:

- titolo con il paragrafo successivo quando possibile;
- didascalia insieme alla figura;
- formule lunghe spezzate semanticamente, non tagliate;
- tabelle con intestazione ripetuta e divisione per righe;
- esercizi suddivisi fra sottopunti quando troppo lunghi;
- diagrammi ridisposti o su pagina dedicata prima di ridurre i caratteri;
- nessun blocco impossibile da spezzare più alto dell'area utile;
- indice e numeri di pagina coerenti con l'output definitivo.

Usare Chromium tramite Playwright con print CSS. Gestire header/footer in template locali e verificare i numeri di pagina. Fissare la versione del browser; non usare quello installato casualmente dall'utente. [API PDF Playwright](https://playwright.dev/docs/api/class-page#page-pdf).

Se servono numeri di pagina nell'indice, adottare un processo in due passaggi controllato e limitato: prima composizione, mappa ancore/pagine, seconda composizione. Se l'indice cambia la paginazione, iterare fino a stabilità con un massimo e un errore esplicito, oppure usare un motore di paginazione collaudato in M00. Non inventare i numeri.

Il file PDF finale conserva grafici SVG vettoriali quando il renderer lo consente; la rasterizzazione per QA non deve sostituirli automaticamente con screenshot. Verificare sul file prodotto la risoluzione e la leggibilità di formule e figure.

## 4. Gate prima del download

ExportRequest contiene documentRevisionId, formato, profilo e draft flag. Il server controlla revisione, report correnti e artifact prima di creare un export.

Per definitivo: gate didattici e visuali obbligatori superati, riferimenti risolti, PDF QA locale superato. Per bozza: stato visibile in apertura e rapporto delle questioni aperte allegato; non inserire avvisi invasivi a ogni riga.

L'export usa artifact già approvati. Se mancano verifiche IA, restituisce EXPORT_REQUIRES_REVIEW e propone di tornare alla revisione del lavoro. Non avvia chiamate IA nascoste durante Scarica PDF. Un difetto emerso solo nell'impaginazione richiede correzione locale; se coinvolge semantica, invalida la revisione e torna alla pipeline.

Cache export: hash della revisione documento + profilo di stampa + versioni renderer/font/browser + formato. Il risultato immutabile è riutilizzabile offline.

## 5. PDF QA

Analizzare tutte le pagine per dimensioni, pagine vuote inattese, elementi fuori area utile, overflow, immagini mancanti, formule non risolte e conteggi delle figure. Confrontare testo e manifest con l'AST, sapendo che l'estrazione PDF può avere differenze tipografiche: usare verifiche mirate, non confronto byte a byte del testo.

Rasterizzare pagine di rischio: figure dense, formule lunghe, tabelle, inizio/fine capitolo e un campione delle altre. In sviluppo ispezionare visualmente le fixture complete. Nel software, la verifica visuale semantica resta quella della fase di generazione; non dichiarare che il solo raster locale capisca il contenuto.

Registrare pagina e bbox per ogni finding. Un PDF aperto con successo non è per questo impaginato correttamente.

## 6. Pacchetto Markdown

Produrre ZIP con:

| Percorso | Contenuto |
|---|---|
| documento.md | Titolo, indice, capitoli, formule e riferimenti relativi |
| assets/ | SVG verificati e immagini originali necessarie |
| manifest.json | Versioni, hash, elenco asset, stato del documento |
| fonti.md | Riferimenti alle fonti e limiti di provenienza |
| verifiche.md | Stato delle verifiche e questioni aperte, se presenti |
| LEGGIMI.md | Come visualizzare il documento e interpretare le formule |

Nessun URL assoluto verso il PC di Marco e nessun riferimento al database locale. Gli amici ricevono gli asset necessari. I materiali originali completi non sono inclusi automaticamente: l'utente sceglie se allegarli.

Il Markdown conserva la matematica con delimitatori coerenti. Documentare che il rendering dipende dal lettore; il PDF è il riferimento di impaginazione.

## 7. Pacchetto LaTeX

Derivare .tex dallo stesso AST, con macro controllate per titoli, teoremi, passaggi, esercizi e riferimenti. Escape dei caratteri testuali separato dalle formule validate. Non accettare preamboli arbitrari generati dal modello.

Allegare figure in formati compatibili con il motore dichiarato: convertire SVG in PDF vettoriale localmente e PNG per raster. Il pacchetto deve comprendere tutto ciò che richiama, una guida di compilazione e un manifest. Scegliere un motore Unicode e versioni/pacchetti documentati nella prova di compatibilità.

La compilazione LaTeX dentro l'app è facoltativa; l'esportazione .tex completa e verificata su un ambiente di test è obbligatoria. Il normale PDF dell'app non richiede installare una distribuzione TeX sul PC dell'utente.

Se la compilazione viene aggiunta, disattivare shell escape e rete, isolare directory e processo, imporre timeout e limiti; il modello non decide i comandi. Il supporto a vecchi blocchi TikZ/Chemfig non autorizza l'esecuzione automatica del sorgente importato.

## 8. Editor e revisioni

L'editor importa Markdown con diagnostica dei costrutti non supportati. Una modifica crea una revisione AST; non sovrascrive l'originale né perde sourceRefs. Per un blocco cambiato manualmente, conservare il legame storico ma segnare che la corrispondenza alla fonte va ricontrollata.

Il confronto evidenzia testo/formule e figure cambiate. Ripristinare una revisione riutilizza report validi soltanto se hash e dipendenze corrispondono. Un cambio solo di titolo può aggiornare l'impaginazione senza nuova chiamata scientifica.

## 9. Accettazione

Lo stesso documento deve produrre PDF e pacchetti Markdown/LaTeX coerenti. La fixture include formula multilinea, tabella lunga, figura ciclica, due grafici con marker omonimi, esercizio a tre sottopunti e citazioni.

Aprire i pacchetti su una cartella diversa, offline: nessun asset mancante. Nel PDF le formule sono leggibili e le figure sono presenti. Due download senza modifiche riusano l'export e non aumentano il numero di chiamate IA.

