# A — Audit della repository e motivazione della ricostruzione

## Snapshot e metodo

Repository privata fornita da Marco: [study_genius](https://github.com/infostoreoverline-cell/study_genius). Branch `main`, commit `f27ee7e2bff9ea6327be9891905e23500a0f1e91`, datato 10 settembre 2026, 20:11:51 UTC. Le conclusioni riguardano questo snapshot, non eventuali modifiche successive.

L'albero completo è stato inventariato senza troncamenti: 17.591 file versionati, inclusi 16.846 file in `node_modules`, 194 nelle copie di checkpoint e 348 nelle sessioni. Sono stati acquisiti 177 file testuali di codice, configurazione, test, prompt, specifiche ed esempi, per 2.696.065 byte. Per ciascuno è stata verificata la corrispondenza dell'hash Git del contenuto: zero differenze. La cartella `src` comprende 73 file e 25.200 righe, incluso il catalogo JSON.

La revisione combina inventario completo, indicizzazione di moduli e importazioni, lettura approfondita dei percorsi operativi e controlli eseguibili. Tutti i 123 file JavaScript acquisiti sono stati sottoposti a `node --check`. Non equivale a una certificazione riga per riga di ogni dipendenza esterna: dipendenze, output binari, sessioni generate e copie storiche sono stati inventariati, non verificati integralmente nel loro contenuto. Il file `.env` presente nell'albero non è stato letto. Non sono state utilizzate le chiavi dell'utente né eseguite chiamate a pagamento.

Non è stato completato un avvio end-to-end: lo snapshot contiene un errore sintattico bloccante, e l'ambiente di audit non contiene l'intero insieme delle sue dipendenze. Le prove isolate descritte sotto eseguono moduli originali con dipendenze esterne simulate; distinguono i difetti del modulo dall'integrazione ancora da provare.

## Come funziona oggi

`server.js` avvia Express e serve `public/`. Il browser carica PDF o presentazioni, richiede estrazione e invia al backend un grande testo aggregato. `extractorService` distingue PDF digitali e scansioni; `visualEvidenceService` applica analisi locale, cache e chiamate Gemini. L'orchestratore filtra gli argomenti, ricava un grafo preliminare, divide il testo in moduli e usa DeepSeek per piano e scrittura parallela. Seguono raccordo dei frammenti, trasformazioni Markdown, audit e salvataggi su file. Il PDF viene generato separatamente tramite HTML, MathJax e Chromium.

Accanto a questo percorso esistono componenti più evoluti: compiler visuale, registri delle figure, cache dei capitoli, assemblatore PDF e revisori. Alcuni sono richiamati dai test o da percorsi secondari e non governano il percorso ordinario. Avere un componente nella repository non dimostra che venga usato quando Marco preme il pulsante.

## Risultati prioritari

I collegamenti seguenti sono fissati al commit analizzato. Le righe si possono consultare aprendo il file; i nomi di funzione identificano il punto interessato.

| ID / gravità | Evidenza | Conseguenza e correzione richiesta |
|---|---|---|
| A01 / bloccante | [schemas.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/schemas.js), righe 301–308: proprietà chimiche fuori da una dichiarazione di oggetto | `SyntaxError` alla riga 303. Un controllo sintattico e di tipi deve precedere ogni rilascio. |
| A02 / alta | [configRoutes.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/configRoutes.js) importa quattro simboli assenti da `promptService` | Preferenze, salvataggio prompt e fallback possono fallire. Contratti tipizzati e test degli endpoint effettivi. |
| A03 / alta | [orchestratorService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/orchestratorService.js), `visualContractsContext` assegnata senza dichiarazione e interpolata anche senza visuali | Possibile `ReferenceError` nel percorso senza figure; nello scope non strict può diventare stato globale. Contesto immutabile per job e TypeScript strict. |
| A04 / alta | Stesso orchestratore: `resetDefaultLedger()` precede `getDefaultLedger()` e il report | Il controllo legge un registro vuoto. Registro per job persistente, controllato prima di concludere. |
| A05 / alta | [visualFeedbackLoop.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/visualFeedbackLoop.js), ritorno finale di `optimizeDiagram` | `bestCandidate.score >= 88` può dichiarare successo con errori critici. La promozione richiede tutti i gate, non una media. |
| A06 / alta | Stesso file, `runBlindFinalReview`, ramo `catch` | Errore di rete restituisce `approved: true`. Una verifica non eseguita deve risultare `unverified`. |
| A07 / alta | [public/app.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/public/app.js), `downloadPDFDirectly`; [exportRoutes.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/exportRoutes.js) | Il frontend non invia `visualQaMode`, la route sceglie `off`. La revisione richiesta deve essere parte del job, precedente all'export. |
| A08 / alta | [diagramEngine.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/diagramEngine.js), `safeEvaluateMath` | `ln(e)` produce 0; valori non definiti diventano 0; `new Function` e filtro incompleto non isolano le espressioni. Un solo valutatore ad AST ristretto, domini e discontinuità espliciti. |
| A09 / alta | [coverageMatrix.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/coverageMatrix.js), `verified: isFound` | La presenza di un nome equivale a verifica. Separare presenza, sviluppo e verifica scientifica. |
| A10 / alta | [critics.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/verification/critics.js) | Chiede `passed/truthScore/issues`, legge `mathPassed/mathIssues/...`: una risposta negativa può diventare positiva. Schema unico e rifiuto delle risposte incomplete. |
| A11 / alta | [jobState.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/jobState.js), `transitionPhase`; chiamate dell'orchestratore | Accetta fasi estranee a `PHASES`; persistenza principale alla fine. Coda persistente con transizioni validate e checkpoint intermedi. |
| A12 / alta | Orchestratore, salvataggio e `continueSessionGeneration` | Conserva soltanto i primi 500 caratteri di fonte nei metadati e riprende dalla coda del testo generato. Non possiede una descrizione affidabile di ciò che manca. Fonti originali e piano residuo persistenti. |
| A13 / alta | [server.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/server.js): `0.0.0.0`, CORS aperto | Per uso personale il servizio deve limitarsi a loopback, con controlli Host/Origin e sessione locale. |
| A14 / alta | [extractorService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/extractorService.js): upload in memoria; configurazione 100 × 500 MB | Limiti teorici incompatibili con una RAM ordinaria. Upload su disco e limiti cumulativi. |
| A15 / alta | [aiService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/aiService.js), `callGeminiRole`, `callGeminiWithCascade`, DeepSeek diretto | Percorsi differenti applicano controlli differenti; manca un unico libro dei costi per job. Tutte le chiamate passano da un gateway comune. |
| A16 / media-alta | [googleAIStudioAccessManager.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/googleAIStudioAccessManager.js), `initializeCredentials` | La chiave inserita via route resta in memoria; altri client leggono l'ambiente. Persistenza sicura e invalidazione coerente di tutti i client. |
| A17 / media-alta | Stesso file, `deriveProjectIdHash` | Hash della chiave usato come identità del progetto; due chiavi dello stesso progetto sono diverse. Il gruppo quota deve rappresentare il progetto reale o dichiarato. |
| A18 / alta | [multimodalRouter.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/multimodal/multimodalRouter.js), `generateMetricsReport` | Usa tariffe fisse generiche, non quelle del modello e della chiamata. Inoltre il blocco assoluto dei modelli Google a pagamento contrasta con il nuovo budget autorizzato. |
| A19 / media-alta | `visualSpecCompiler.js` contro `diagramEngine.js`; riferimenti rilevati nel codice | Il compiler centralizzato non è il passaggio ordinario del generatore/export. Unificare parsing, registry, validazione, salvataggio e inclusione delle figure. |
| A20 / media-alta | Orchestratore: primi 30 argomenti; prime 10 evidenze visuali; ruoli di shard ciclici | Rischio di omissioni e di assegnare soltanto “fondamenti” a un pezzo che contiene anche esercizi. Pianificare unità didattiche complete con mapping di tutta la fonte. |
| A21 / media-alta | Orchestratore: audit prima di repair; report riutilizzato dopo | Il giudizio può riferirsi a una revisione diversa dal testo consegnato. Ogni report deve contenere l'hash della revisione verificata. |
| A22 / media | `extractorService`: pagine stimate per proporzione di caratteri; PPT `pageCount: 1` | Riferimenti di fonte e figure possono essere associati alla pagina errata. Estrarre per pagina/slide reale. |
| A23 / media | `public/index.html`: librerie e font da CDN; renderer diversi client/server | Anteprima/esportazione possono divergere e dipendere dalla rete. Asset locali e un renderer condiviso. |
| A24 / media | `sessionService`: scritture separate e nomi ricavati da parametri | Rischi di revisioni incoerenti, cancellazione incompleta e percorsi non validati. ID opachi, transazioni e gestione centralizzata degli artifact. |

## Prove eseguite

Controllo sintattico: 122 file validi, 1 non valido. Le suite originali `test_schemas_contracts.js` e `test_visual_reading_contract.js` terminano entrambe con codice 1 sullo stesso errore di parsing, prima delle asserzioni. Non vengono presentate come test funzionali completati.

Dieci prove isolate, con Node v24.19.0 e servizi simulati, hanno confermato: quattro export mancanti; logaritmo errato; singolarità trasformata in zero; modifica di un innocuo marcatore globale da un'espressione; copertura verificata sul solo nome; fase inesistente accettata; risposta negativa del critic interpretata come positiva; perdita del registro dopo reset; accettazione visuale con un errore critico; approvazione in caso di errore di rete. I dettagli e le riproduzioni sono nel documento 17.

I difetti delle funzioni isolate sono latenti rispetto all'avvio completo: per raggiungerli nel prodotto occorre prima superare il difetto sintattico. Non sono prove che ogni sessione già prodotta sia scientificamente errata.

## Cosa conservare

Conservare la priorità assegnata a verità, completezza e ricostruibilità; le lenti per materia; scope e focus assistito; registri di provenienza; controlli locali economici; specifiche visuali semantiche; generazione deterministica; riparazioni circoscritte; archivio e formule vettoriali. Ricostruire il collegamento operativo tra questi componenti, eliminando stato globale di job, doppie implementazioni e successo implicito nei fallback.
