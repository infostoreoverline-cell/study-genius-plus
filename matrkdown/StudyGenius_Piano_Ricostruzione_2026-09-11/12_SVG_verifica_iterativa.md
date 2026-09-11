# K — Verifica e correzione iterativa delle figure

Dipendenze: 08–11. Il ciclo combina misure geometriche locali e lettura multimodale. L'obiettivo è migliorare figure e mappe entro limiti verificabili, senza promettere una perfezione certificata da un punteggio IA.

## 1. Che cosa viene controllato

| Livello | Domanda | Verifica |
|---|---|---|
| Contratto | La figura è rappresentabile e sicura? | Schema, riferimenti, whitelist SVG |
| Semantica | Dati, formule, relazioni e direzioni sono coerenti? | Vincoli locali ed evidenze originali |
| Geometria | Si leggono testi, frecce e formule senza tagli? | Misure nel browser e manifest geometrico |
| Comprensione | La figura comunica ciò che serve al capitolo? | Revisione multimodale con contesto e fonte |
| Documento | Resta leggibile sulla pagina esportata? | Rendering alla dimensione finale e PDF QA |

La ground truth deriva dalla fonte, dai dati e dai requisiti scientifici verificati. Non si ricostruisce chiedendo al modello di spiegare lo stesso SVG che deve giudicare: ne erediterebbe gli errori.

## 2. Stati per revisione visuale

SPEC_DRAFT → COMPILED → LOCAL_CHECKED → REVIEWED → ACCEPTED oppure NEEDS_REVIEW/REJECTED. PATCHING produce una nuova revisione, non modifica la vecchia.

ACCEPTED richiede:

- schema e controlli di sicurezza validi;
- zero findings critical o major irrisolti;
- zero difetti geometrici bloccanti;
- revisione semantica richiesta eseguita con successo;
- report legati all'hash della revisione corrente.

I finding minor possono rimanere soltanto se documentati e senza compromettere leggibilità/interpretazione. Lo stato applicativo è calcolato dal sistema; un modello non lo imposta direttamente.

Gli stati di report del documento 04 restano passed, failed, needs_review e unverified. Un errore di rete produce unverified; un errore scientifico accertato produce failed. Punteggi e conteggi contraddittori producono report invalido, senza default di approvazione.

## 3. Controllo geometrico

Aprire SVG sanitizzato nel renderer locale, attendere font e formule, misurare nella stessa scala usata per stampa. Per ogni elemento confrontare bounding box, percorsi e area utile.

Controlli obbligatori:

- testo/testo e testo/nodo non appartenente;
- testo/freccia e testo/bordo quando rendono ambiguo il collegamento;
- clipping rispetto a viewBox, clipPath e box dei nodi;
- punte di freccia staccate o coperte;
- legenda e assi sovrapposti;
- label duplicate, mancanti o fuori pannello;
- dimensione finale dei caratteri e contrasto.

Le sovrapposizioni intenzionali hanno una relazione esplicita, per esempio testo dentro il proprio nodo. Non ignorare globalmente tutte le intersezioni con i rettangoli.

Baseline di layout: margine interno 12 CSS px, distanza etichetta/linea 6 px, distanza nodi 24 px alla dimensione di progetto. Al formato finale stampato mirare a testo di almeno 9 pt; 8 pt è il minimo per annotazioni secondarie. Sono soglie progettuali da tarare con fixture, non garanzie universali.

Un bounding box non descrive ogni percezione: gli incroci ammessi vanno distinti da quelli confusi, e una figura geometricamente libera può essere scientificamente sbagliata.

## 4. Revisione multimodale

Per ogni figura richiesta effettuare almeno una revisione semantica nella generazione standard. Le figure facoltative che si vogliono presentare come verificate seguono gli stessi criteri. Google Gemini è il revisore iniziale; DeepSeek con capacità visuale collaudata è un'alternativa configurabile.

Inviare:

1. raster dell'SVG alla scala finale, più eventuale crop se denso;
2. intento didattico e testo adiacente;
3. modello semantico, dati e formule di riferimento;
4. evidenza originale quando la figura ne è una ricostruzione;
5. schema del rapporto e criteri di gravità.

Il revisore deve identificare elementi concreti tramite ID o descrizione localizzabile. Non chiedergli “è bello?”: chiedere quali informazioni sono leggibili, corrette, ambigue o mancanti. Se la risoluzione non basta a leggere una formula, deve dichiararlo.

Esempio di finding:

```json
{
  "id": "finding-overlap-1",
  "severity": "major",
  "code": "LABEL_OVERLAP",
  "targetIds": ["node-equilibrium-label", "edge-return"],
  "explanation": "La freccia di ritorno attraversa la parola equilibrio.",
  "evidenceRefs": [],
  "suggestedAction": "Instradare l'arco fuori dal rettangolo dell'etichetta."
}
```

Separare errori scientifici, omissioni, etichette, routing, scala, densità, leggibilità e layout di pagina. Includere confidence solo come indizio non calibrato.

## 5. Loop limitato

Per figura: candidato iniziale, al massimo due microcorrezioni, al massimo una riprogettazione del layout. Totale massimo quattro candidati valutati. Una revisione finale indipendente aggiuntiva è richiesta dopo una riprogettazione o una modifica semantica importante; massimo cinque chiamate di revisione visuale riuscite per ciclo, oltre ai retry fisici consentiti e contabilizzati.

Le patch di layout deterministiche non richiedono un modello per essere inventate: il sistema può applicare regole. Se serve una proposta IA, è una chiamata REPAIR separata, entro il numero di candidati e il budget globale. Tutti i tentativi falliti consumano comunque il budget applicabile.

Sequenza:

1. Compilare il candidato e controllarlo localmente.
2. Se il difetto è geometrico semplice, applicare la prima correzione locale disponibile; non pagare una revisione per un SVG già illeggibile.
3. Quando il candidato supera i controlli locali, eseguire la revisione semantica.
4. Convertire findings correggibili in patch strutturate.
5. Applicare patch ammesse a una nuova revisione e ricontrollare.
6. Se non migliora dopo due microcorrezioni, ridisegnare il layout preservando il contenuto oppure fermarsi.
7. Eseguire la revisione finale richiesta e accettare soltanto se tutti i gate passano.
8. Se restano difetti, conservare il miglior candidato e indicare NEEDS_REVIEW; la UI offre modifica manuale, suddivisione o esclusione esplicita se facoltativa.

Il budget può fermare il ciclo prima del limite. Il limite non autorizza a spendere oltre il tetto del riassunto. Non trattare il quinto tentativo come un diritto a una figura approvata.

## 6. Patch ammesse

Patch con targetId, operazione, valore, preconditionHash e motivo. Operazioni iniziali: moveLabel, resizeNode, increasePadding, rerouteEdge, changeOrientation, splitPanel, adjustLegend, expandCanvas. Ogni operazione ha limiti numerici e verifica dei target.

La patch non contiene XML, CSS arbitrario, codice, nuovo dato numerico scientifico o cambio di endpoints. Una proposta che cambia formula, carica, unità o relazione è un repair semantico, con revisione della fonte e invalidazione dei controlli.

Preferire aumentare spazio o dividere la figura prima di ridurre il font. Per un arco, ricalcolare il percorso a partire dagli stessi endpoints; non spostare una punta manualmente vicino al nodo sbagliato.

## 7. Scelta del candidato e anti-oscillazione

Ordinare i candidati con priorità lessicografica: sicurezza/validità, findings scientifici critici, findings major, difetti geometrici, chiarezza, estetica. Un punteggio medio alto non può compensare un errore critico.

Registrare hash semantico, hash layout, findings e patch. Se ricompare uno stesso hash o la stessa configurazione di difetti senza progresso, interrompere il ciclo. Se una patch peggiora un vincolo bloccante, rollback alla revisione migliore; non sommare patch sul candidato peggiore.

La revisione finale può vedere intento, fonte e figura ma non i punteggi precedenti. Se il servizio non risponde, conservarla come unverified. Non assegnare un voto inventato per far continuare la pipeline.

## 8. Integrazione nel flusso normale

La generazione crea e verifica gli artifact prima che il documento sia “pronto”. Il pulsante Scarica PDF usa proprio gli artifact verificati e controlla che gli hash coincidano. Non introduce un parametro visualQaMode off implicito.

Se l'utente modifica una figura dall'editor, la UI mostra quali controlli sono diventati obsoleti. La nuova verifica usa il residuo del lavoro. Esportare la vecchia revisione accettata resta possibile.

Una bozza con figura non verificata si può esportare con stato e avviso visibili. L'utente non può trasformare una mancata verifica in “verificata” semplicemente premendo Procedi: può soltanto accettare consapevolmente una bozza con limitazioni.

## 9. Accettazione

Fixture minime: overlap reale, overlap intenzionale, label tagliata, arco con endpoint sbagliato, grafico scientificamente errato ma ordinato, mappa corretta ma troppo densa, punteggio 100 con finding critico, report con campi mancanti, errore di rete nel controllo finale, patch peggiorativa, oscillazione A→B→A, budget esaurito e font diverso.

Per ciascuna figura salvare prima/dopo e rapporto delle misure. Nel test end-to-end il PDF scaricato dal pulsante normale deve contenere lo stesso SVG accettato, alla dimensione verificata. Non basta testare optimizeDiagram da solo.

