# N — Test, errori e criteri di accettazione

Questo documento distingue prove da realizzare nel nuovo software dalle verifiche già eseguite sul vecchio snapshot, riportate in 01 e 17. Una casella pianificata non conta come test superato.

## 1. Strategia

Usare test deterministici per denaro, stati, fonti, matematica, routing e rendering; test di integrazione per persistenza, processi e API; test end-to-end per il percorso realmente usato da Marco. Usare valutazioni umane e rubriche esplicite per la qualità didattica. Una risposta del modello non è un oracle indipendente.

Comandi della nuova repository da implementare in package.json:

| Comando | Responsabilità |
|---|---|
| npm run typecheck | Contratti, import, variabili, discriminated union |
| npm run lint | Regole pertinenti, incluso divieto di chiamate provider fuori gateway |
| npm run test:unit | Invarianti di dominio e calcolo |
| npm run test:integration | API, SQLite, storage, code e adapter simulati |
| npm run test:e2e | Browser, launcher, editor, download e ripresa |
| npm run test:render | SVG/PDF e confronto delle fixture |
| npm run eval:providers | Benchmark reale, attivato esplicitamente con limite di spesa |
| npm run verify | Gate deterministici richiesti per la release |

Il comando verify non richiede chiavi vere e non invia richieste a pagamento. I test reali dei provider si lanciano separatamente, con costo visibile e registrato.

## 2. Fixture minime

| ID | Materiale | Esito atteso |
|---|---|---|
| F01 | PDF digitale di 12 pagine, due colonne e note | Ordine leggibile e citazioni alla pagina corretta |
| F02 | PDF misto con scansioni, pagina vuota e formula ambigua | OCR selettivo; ambiguità conservata |
| F03 | PPTX di 8 slide con note, immagini e formula | Slide reali; nessuna perdita silenziosa |
| F04 | DOCX con tabella, equazione e immagine | Provenienza per struttura; unsupported esplicito |
| F05 | Esercizio di Gauss con rho costante e tre sottopunti | Integrali/limiti, raccordo e figura coerente |
| F06 | Esercizio distinto con rho(r)=k r | Q=πkR⁴ e formule interne/esterne corrette, senza riuso della densità costante |
| F07 | ln(e), 1/x, tan(x), sqrt(x), funzione a tratti | Numeri corretti, gap e domini |
| F08 | Mappa con 18 nodi, un ciclo e rimandi trasversali | Relazioni preservate e label leggibili |
| F09 | Campioni per tutti i sottotipi chimici del documento 11 | Cariche, legami, frecce e conteggi controllati |
| F10 | Tabella sperimentale con unità e incertezze | Dataset fedele, assi e barre d'errore coerenti |
| F11 | Capitolo lungo con formule multilinea, tabella e figure | PDF senza tagli o placeholder |
| F12 | Documento con istruzioni ostili e markup attivo | Trattato come fonte; nessuna azione o esecuzione |
| F13 | Archivio precedente con asset mancanti | Importazione legacy dichiarata non verificata |
| F14 | Progetto in due revisioni con una formula cambiata | Invalidazione selettiva di grafico/report/export |
| F15 | Risposte provider redatte: normale, troncata, rifiutata, invalida | Normalizzazione e stati corretti |
| F16 | Dataset economico con prezzi fittizi esatti | Ledger riconciliabile dopo ogni evento |

Le fixture di fisica/chimica sono piccole e controllate manualmente. Conservare fonte, soluzione attesa e licenza/provenienza dei materiali di test. Evitare dati personali o interi manuali nel repository dei test.

## 3. Regressioni dell'audit

| Difetto originale | Prova obbligatoria nel nuovo sistema |
|---|---|
| A01–A03 | Build strict; endpoint preferenze raggiungibile; lavoro senza figure |
| A04 | Registro visuale persistente e non vuoto nel rapporto finale |
| A05–A06 | Voto massimo con finding critico fallisce; rete assente produce unverified |
| A07 | Download normale usa solo revisioni con gate coerenti |
| A08 | Logaritmi, singolarità e rifiuto di espressioni con effetti collaterali |
| A09–A10 | Nome del concetto non verifica copertura; schema critic errato non passa |
| A11–A12 | Fase sconosciuta rifiutata; ripresa usa fonte e requisiti residui |
| A13–A14 | Loopback/sessione; upload streaming e limiti aggregati |
| A15–A18 | Ogni chiamata fisica tracciata con modello/prezzo/account effettivi |
| A19–A20 | Ogni figura passa dal registry; copertura oltre 30 concetti e 10 figure |
| A21 | Repair invalida rapporto e riesegue controlli dipendenti |
| A22–A24 | Pagine reali, export offline coerente, revisioni atomiche |

## 4. Matrice degli errori operativi

| Caso | Stato/risposta | Recupero e prova |
|---|---|---|
| Chiave assente | PROVIDER_NOT_CONFIGURED | Impostazioni aperte; nessuna richiesta inviata |
| Chiave non valida, 401/403 | WAITING_PROVIDER | Sostituzione dalla UI; nessun retry cieco |
| Modello rimosso | MODEL_UNAVAILABLE | Catalogo/alternativa compatibile; prezzo riesaminato |
| Quota, 429 | WAITING_PROVIDER | Retry-After e gruppo quota; concorrenza ridotta |
| Credito provider esaurito | WAITING_PROVIDER | Conservare lavoro, indicare account |
| DNS/TLS/rete prima dell'invio certo | NOT_SENT o errore esplicito | Rilascio solo con evidenza dell'assenza di invio |
| Timeout dopo possibile invio | UNCERTAIN | Prenotazione trattenuta, nessun costo dimenticato |
| Risposta streaming interrotta | Task incompleto | Blocchi validi in bozza; continuazione pianificata |
| Finish reason length | Task incompleto | Nessun capitolo completo fittizio |
| Rifiuto del provider | PROVIDER_BLOCKED | Motivo normalizzato; revisione dell'input |
| JSON malformato | OUTPUT_SCHEMA_INVALID | Un repair strutturale entro limiti |
| JSON valido con campi mancanti | OUTPUT_SCHEMA_INVALID | Nessun default passed |
| Usage mancante | UNCERTAIN | Costo prudenziale fino a riconciliazione |
| Prezzo scaduto/valuta sconosciuta | PRICE_UNAVAILABLE | Niente chiamate a prezzo zero inventato |
| Due richieste sullo stesso residuo | Una prenotazione ammessa, altra respinta | Transazione atomica |
| Risposta duplicata | Replay idempotente | Una sola regolazione economica |
| Retry dopo timeout | Nuova chiamata fisica | Anche il costo incerto precedente resta occupato |
| Annullamento con chiamata attiva | CANCEL_REQUESTED poi CANCELLED | Costi conservati; nessun nuovo invio |
| Browser chiuso | Job continua | Riapertura e replay SSE |
| Server interrotto | Recupero al riavvio | Lease scadute e chiamate ambigue |
| Worker bloccato | Lease/timeout scaduti | Sostituire il worker, non duplicare invii ignoti |
| Renderer Chromium chiuso | Task rendering fallito | Riavvio limitato, lavoro didattico conservato |
| Spazio insufficiente | STORAGE_FULL | Stop sicuro, pulizia/nuova directory |
| SQLITE_BUSY temporaneo | Retry locale limitato | Nessuna transazione parziale |
| Database corrotto | ARCHIVE_UNAVAILABLE | Diagnostica e restore; niente riparazione distruttiva automatica |
| Due tab salvano la stessa revisione | 409 REVISION_CONFLICT | Confronto e scelta della versione |
| File corrotto/password errata | IMPORT_FAILED per file | Altri file conservati |
| File/archivio eccessivo | 413 o INGESTION_LIMIT | Nessuna saturazione della memoria |
| Pagina/formula illeggibile | NEEDS_REVIEW | Riferimento all'area e correzione mirata |
| Fonte cambiata | Nuova revisione | Invalidazione delle dipendenze |
| Fonte rimossa mentre serve | SOURCE_IN_USE | Rimozione differita o annullamento esplicito |
| Citazione inesistente | SOURCE_REFERENCE_INVALID | Repair o controllo manuale |
| Consegna senza tutti i sottopunti | COVERAGE_INCOMPLETE | Capitolo non definitivo |
| Formula/dato senza evidenza | SCIENTIFIC_FINDING | Fonte, derivazione o etichetta di esempio |
| VisualSpec sconosciuta | UNSUPPORTED_VISUAL_KIND | Nessun fallback chimico generico |
| SVG con script/URL attivo | UNSAFE_ARTIFACT | Rifiuto, mai inserimento nel DOM |
| Singolarità matematica | Campione missing | Polilinea spezzata, niente valore zero |
| Label sovrapposte | VISUAL_LAYOUT_FAILED | Patch limitata o split |
| Figura ordinata ma falsa | VISUAL_SEMANTIC_FAILED | Repair scientifico, non aumento punteggio |
| Revisore non disponibile | unverified | Attesa o bozza segnalata |
| Patch peggiora la figura | Candidato rifiutato | Rollback alla revisione migliore |
| Loop A→B→A | VISUAL_NO_PROGRESS | Stop, cronologia visibile |
| Budget finito durante QA | WAITING_BUDGET | Nessuna approvazione implicita |
| Report riferito a vecchio hash | REVIEW_STALE | Rieseguire i controlli necessari |
| Asset export mancante | EXPORT_INCOMPLETE | Ricostruzione locale o errore esplicito |
| Formula non renderizzata nel PDF | PDF_QA_FAILED | Correzione del renderer/formula |
| Backup interrotto | Backup non verificato | Non mostrarlo come punto di restore sano |
| Restore di backup vecchio | RECONCILIATION_REQUIRED se necessario | Non ripristinare residuo economico già consumato |
| Migrazione fallita | Archivio precedente conservato | Rollback controllato |
| Chiavi non decifrabili su altro PC | PROVIDER_NOT_CONFIGURED | Reinserimento dalla UI |
| Richiesta da origine esterna | 403 | Nessuna mutazione locale |
| Path traversal/junction fuori radice | 400/403 | Nessuna lettura/scrittura esterna |

I codici definitivi devono essere enumerati in packages/contracts e tradotti nella UI; questa matrice ne definisce la semantica. Distinguere codice errore HTTP, stato di job, stato di chiamata e stato di report: non usare un'unica enum per tutto.

## 5. Prove di crash e atomicità

Inserire fault injection nei punti concreti: dopo prenotazione, prima invio, dopo invio senza risposta durevole, dopo scrittura temporanea, dopo rename del blob, prima commit, dopo commit prima risposta HTTP, durante backup e durante migrazione.

Per ogni interruzione controllare: un solo effetto logico, nessun artifact ready inesistente, budget conservativo, revisione precedente leggibile, task recuperabile o blocco motivato. Non affermare exactly-once per chiamate esterne se il provider non offre idempotenza effettiva.

Testare la sequenza pausa/riprendi/annulla con timer e rete simulati; la chiusura della connessione SSE non è un comando di annullamento.

## 6. Benchmark didattico e scelta modelli

Preparare 20 campioni brevi: maggiore peso a Fisica e Chimica, includendo Chimica Fisica e Analitica; almeno un campione per le altre materie dichiarate supportate. Usare 6 casi difficili ripetuti per osservare variabilità. Ogni comparazione usa lo stesso dossier e requisito.

Valutare senza mostrare il nome del modello al valutatore:

- correttezza e assenza di affermazioni non sostenute;
- copertura dei requisiti;
- chiarezza dei passaggi matematici;
- autonomia degli appunti;
- utilità e correttezza delle figure;
- aderenza alla modalità;
- costo totale, tempo e numero di repair.

Rubrica 0–4 per le dimensioni qualitative: 0 inutilizzabile; 1 lacune gravi; 2 utilizzabile con interventi sostanziali; 3 buono con correzioni minori; 4 pienamente conforme al campione. Una media non compensa errori scientifici critici.

Criterio di selezione iniziale: zero errori critici nelle soluzioni di riferimento, tutti i requisiti obbligatori coperti o esplicitamente bloccati, mediana almeno 3 nelle dimensioni didattiche e rispetto del tetto di ogni lavoro di prova. Un caso fallito resta documentato; ripetere selettivamente dopo una correzione, senza nascondere il primo esito.

Il benchmark non certifica tutte le future risposte. Determina la policy iniziale per compito e materia. Impostare un budget separato per l'intera sessione di valutazione e per ciascun campione; non lanciare decine di confronti reali senza limite.

## 7. Prestazioni e risorse

Misurare sul PC locale e registrare CPU, RAM, runtime e versioni. Profilo di riferimento iniziale: macchina Windows con 16 GiB RAM; i risultati vanno dichiarati solo dopo misura. Il backend non richiede GPU.

Verificare 100 pagine digitali, 20 pagine scansionate e documento con 20 figure attraverso coda limitata. Non imporre un tempo fisso di generazione indipendente dal provider. Misurare latenza UI, consumo massimo RAM, dimensione temporanei e recupero dopo pressione di memoria.

Target UX iniziale da misurare: operazioni archivio locale comuni entro un secondo su fixture normale; aggiornamenti di avanzamento senza bloccare input e scroll. Se il materiale è più grande, mostrare progresso e lavorare per finestre, non allocare tutto in memoria.

## 8. Gate finali della versione completa

- Installazione e avvio da PC pulito; nessun intervento sul codice per le chiavi.
- Google e DeepSeek realmente collegati e contabilizzati.
- Tutte le modalità e i sottotipi visuali obbligatori raggiungibili dalla UI.
- Provenienza e copertura controllabili dalle fonti.
- Nessuna regressione A01–A24 aperta senza blocco esplicito della relativa funzione.
- Budget/ripresa/backup testati con guasti.
- PDF/Markdown/LaTeX completi e utilizzabili.
- Export offline e zero nuove chiamate IA per revisioni pronte.
- Nessun errore scientifico critico noto in una revisione marcata definitiva.
- Rapporto di release con prove eseguite, esiti, costo dei test reali e limiti residui.

## 9. Verbale di prova

Per ogni milestone salvare: commit nuovo, ambiente, comandi eseguiti, fixture, esiti, artifact dimostrativo e problemi aperti. Per valutazioni umane registrare rubrica e osservazioni. Per servizi reali annotare modello richiesto/riportato, data e costo. Non sostituire il verbale con “tutto funziona”.

