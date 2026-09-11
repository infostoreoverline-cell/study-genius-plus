# F — Ingestione, provenienza e recupero delle fonti

Dipendenze: 04, 05, 09. Risultato: il generatore riceve materiale identificabile e leggibile, con riferimenti reali a pagine o slide.

## 1. Formati della versione completa

| Ingresso | Percorso principale | Provenienza e alternativa |
|---|---|---|
| PDF testuale | PDF.js, pagina per pagina, testo e coordinate | Pagina reale; raster solo per pagine problematiche |
| PDF scansionato o misto | Rilevazione per pagina, raster e OCR selettivo | Pagina, area e metodo; testo OCR distinto dall'originale |
| PPTX | Parsing OOXML: slide, testi, note, immagini, relazioni | Numero slide reale e posizione dell'oggetto |
| DOCX | Paragrafi, titoli, tabelle, immagini, formule supportate | Sezione/paragrafo; non inventare pagine da un formato reimpaginabile |
| TXT e Markdown | Parser con codifica rilevata e confermata se ambigua | Intervallo di righe e heading |
| PNG, JPEG, WebP | Dimensioni e orientamento, OCR/analisi selettivi | Coordinate nell'immagine e hash |
| Testo incollato | Documento immutabile creato dall'app | Paragrafi e revisione |

Per PPTX, convertire slide in immagini quando il testo non basta a ricostruire grafici, formule o relazioni spaziali. Utilizzare un adapter locale di conversione, per esempio LibreOffice, solo dopo il test M00 sul PC: processo isolato, timeout, profilo temporaneo e macro disabilitate. Se il convertitore non è disponibile, mostrare quali slide richiedono un PDF esportato da PowerPoint. La pipeline non dichiara completa una slide di cui vede soltanto le note.

I formati legacy DOC/PPT, PDF cifrati senza password, archivi arbitrari e URL remoti non sono ingressi impliciti. Spiegare come convertirli nei formati supportati; non inviarli a servizi esterni non configurati.

## 2. Procedura deterministica

1. Ricevere il file in streaming in una directory temporanea del task. Verificare firma, tipo reale, limiti, nome normalizzato e dimensioni espanse.
2. Calcolare SHA-256 mentre si scrive; finalizzare il blob con rename atomico. Duplicati dello stesso byte stream condividono il blob, mantenendo i diversi collegamenti ai progetti.
3. Estrarre metadati e unità di fonte. Ogni unità ha posizione reale, testo originale, testo normalizzato, qualità di estrazione, versione dell'estrattore e riferimenti agli oggetti visuali.
4. Identificare intestazioni ripetute, colonne, tabelle, formule, liste e ordine di lettura. Conservare l'originale: la normalizzazione non deve sovrascriverlo.
5. Rilevare pagine problematiche con indicatori espliciti: pochi caratteri su una pagina visivamente piena, caratteri sostitutivi, ordine incoerente, immagini contenenti testo, formula non interpretata. Sono segnali, non una prova automatica di inutilizzabilità.
6. Mostrare un riepilogo e una piccola anteprima delle anomalie. Applicare OCR a quelle unità soltanto, dopo prenotazione del costo se remoto.
7. Costruire evidenze citabili: brano, tabella, formula, immagine, area; collegarle alle unità originali.
8. Produrre un rapporto di ingestione. Il piano didattico può iniziare quando sono note le parti leggibili, incerte ed escluse.

Un errore in una pagina non deve cancellare tutte le altre. La UI indica, per esempio, “37 pagine leggibili, 2 da controllare, 1 esclusa”. Una pagina esclusa resta nel conteggio delle fonti e nell'avviso di completezza.

## 3. Coordinate e citazioni

Per PDF/immagini usare coordinate normalizzate tra 0 e 1, origine in alto a sinistra, dopo aver applicato l'orientamento. Conservare anche dimensioni originali, rotazione e trasformazione usata. Per slide usare lo spazio della slide con trasformazione normalizzata. Per testo usare intervalli di caratteri nella revisione immutabile, non nell'editor corrente.

Una citazione contiene almeno: documentId, sourceUnitId, evidenceId, posizione e hash della revisione. L'interfaccia apre la fonte sulla pagina/slide corretta ed evidenzia il brano. Il titolo mostrato è decorativo: il collegamento non dipende dal nome del file.

Mai stimare le pagine distribuendo il testo in proporzione al numero di caratteri. Per DOCX/TXT, citare sezione e paragrafo senza falsa precisione.

## 4. OCR e formule

Preferire il testo già presente quando è utilizzabile. Per scansioni, prevedere OCR locale con adapter sostituibile e revisione mirata tramite un modello multimodale configurato. La scelta dell'OCR locale richiede una prova su italiano, pedici, apici e simboli scientifici; se fallisce, la UI propone la lettura multimodale entro budget.

Il modello riceve la pagina o un crop con margine sufficiente, più l'identificatore della fonte. Deve distinguere testo letto, formula trascritta e inferenza. Una formula ambigua mantiene alternative e motivazione: per esempio segno meno illeggibile o indice non certo. Non ricostruire silenziosamente una formula da ciò che “dovrebbe esserci”.

Separare:

- confidenza dell'estrazione;
- corrispondenza con il materiale;
- correttezza scientifica del materiale;
- utilità didattica dell'eventuale spiegazione aggiunta.

Un libro può contenere un errore; una trascrizione fedele può quindi richiedere una nota critica con fonte e motivazione.

L'uso diretto di documenti nel servizio Google passa dall'adapter e rispetta i limiti effettivi della versione scelta. Non assumere che l'intero PDF sia sempre accettabile: l'app sa dividere per pagine e misurare il payload. [Document processing Google](https://ai.google.dev/gemini-api/docs/document-processing).

## 5. Segmentazione e contesto

Dividere per struttura, non per un unico taglio fisso di caratteri. Un segmento deve contenere il contesto minimo per interpretare ciò che cita: titolo, definizioni dei simboli, tabella completa, enunciato con ipotesi. Non separare dimostrazione e ipotesi senza un riferimento esplicito.

Budget iniziale indicativo: segmenti da 1.500–3.000 token stimati, adattabili; sovrapposizione solo per contesto e mai conteggiata due volte come copertura. Per una tabella lunga usare segmenti con intestazioni replicate e identificatori di riga. Per una derivazione mantenere passaggi e rimandi.

Creare un indice locale full-text, filtri per fonte/sezione e un grafo di concetti. Il recupero iniziale può essere lessicale più strutturale; gli embedding non sono obbligatori. Se aggiunti, passano da un adapter con modello, costo, dimensione e versione dell'indice registrati.

Ogni richiesta di scrittura riceve un dossier compatto:

- obiettivo del capitolo e requisito di copertura;
- evidenze pertinenti con identificatori validi;
- contesto dei prerequisiti e simboli già introdotti;
- parti mancanti o illeggibili;
- vincoli didattici e visuali;
- limite di uscita e schema.

Il dossier conserva un manifest, sufficiente a ricostruire la richiesta dopo un riavvio. Non basta salvare 500 caratteri della fonte o gli ultimi caratteri generati.

## 6. Cache e invalidazione

Chiave di estrazione: hash del file + versione parser + opzioni + versione OCR. Chiave di dossier: hash delle evidenze selezionate + piano + profilo. Chiave di generazione: dossier + prompt + modello/configurazione + schema.

Cambiare il nome di un file non rigenera gli appunti. Cambiare una formula corretta manualmente crea una nuova revisione di evidenza e invalida i capitoli/figure dipendenti. Una cache appartenente a un altro progetto non introduce informazioni senza provenienza.

Per immagini provenienti da slide o libri conservare l'asset quando la riproduzione è utile: non convertire una fotografia in uno SVG fittizio. L'app può affiancare uno schema esplicativo, etichettato come ricostruzione.

## 7. Errori e recupero

| Caso | Esito richiesto |
|---|---|
| File corrotto/troncato | Importazione fallita per quel file; nessun blob presentato come valido |
| PDF con password | Richiesta locale della password, senza log o conservazione predefinita |
| OCR fallito o budget insufficiente | Fonte importata, unità marcata da verificare; job in attesa se indispensabile |
| Formula ambigua | Evidenza incerta e controllo mirato; niente completamento definitivo del requisito |
| OOXML con espansione enorme | Arresto prima dell'esaurimento del disco/RAM; eliminazione temporanei |
| Pagina vuota | Registrarla come vuota, senza chiamata IA |
| Ordine colonne dubbio | Anteprima e correzione di lettura, conservando la versione iniziale |
| Stessa fonte ricaricata | Deduplicazione del blob e riuso delle estrazioni compatibili |
| Fonte rimossa durante un job | Impedire la rimozione distruttiva finché è in uso, oppure annullare esplicitamente il job |
| Internet assente | Estrazione locale disponibile; task remoto persistente in WAITING_PROVIDER |

## 8. Accettazione

Su un PDF misto di 12 pagine, le citazioni aprono le pagine corrette e soltanto le scansioni richiedono OCR. Su PPTX di 8 slide, nessun “pageCount = 1” e nessuna perdita silenziosa delle note. DOCX con formula non supportata deve segnalarla. Reimportare lo stesso file non raddoppia spazio e costi. Interrompere l'importazione non lascia un documento completato con blob parziale.

