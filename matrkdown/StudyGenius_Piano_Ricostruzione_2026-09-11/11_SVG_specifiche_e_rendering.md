# J — Specifiche visuali e rendering SVG

Dipendenze: 04, 07, 10. La separazione fondamentale resta: il modello propone una descrizione strutturata; il computer costruisce la figura. Il modello non deve produrre JavaScript, SVG arbitrario o comandi da eseguire.

## 1. Un solo percorso

Ogni figura segue VisualIntent → VisualSpec validata → modello semantico → layout → SVG → controlli → artifact. La stessa pipeline serve generazione, correzione, anteprima ed esportazione.

VisualIntent indica perché la figura serve, che cosa deve rendere comprensibile, quali evidenze usa, se è necessaria, dove appare e come verrà spiegata nel testo. “Aggiungi un'immagine bella” non è un intento sufficiente.

Il compilatore usa un registry esaustivo per kind. Un tipo sconosciuto restituisce UNSUPPORTED_VISUAL_KIND. Non indirizzarlo genericamente alla chimica o a una tabella priva del contenuto richiesto.

## 2. Contratto comune

VisualSpec contiene schemaVersion, visualId, revision, kind, intent, sourceRefs, provenance, semanticModel, presentation e accessibility. I dati scientifici sono separati dalle coordinate grafiche.

- semanticModel: entità, relazioni, espressioni, unità, ipotesi, dati e vincoli scientifici.
- presentation: formato, direzione, spaziature, palette, dimensioni, preferenze di layout.
- accessibility: titolo, descrizione, alternativa testuale utile.
- sourceRefs: evidenze valide, con relazioni di supporto o ricostruzione.
- provenance: fonte esatta, ricostruzione, derivazione o esempio sintetico secondo 04.

Una patch di layout non può cambiare semanticModel. Una correzione scientifica crea una revisione semantica e invalida i rapporti dipendenti.

Esempio semplificato, con ID segnaposto da sostituire con UUID nel software:

```json
{
  "schemaVersion": "1.0",
  "visualId": "uuid-visual",
  "revision": 1,
  "kind": "function_plot",
  "intent": {
    "purpose": "Mostrare due rami separati da una singolarità",
    "required": true,
    "requirementIds": ["uuid-requirement"]
  },
  "sourceRefs": [],
  "provenance": "synthetic_example",
  "semanticModel": {
    "x": {"symbol": "x", "unit": "1", "domain": [-2, 2]},
    "y": {"symbol": "f(x)", "unit": "1"},
    "series": [{
      "id": "series-1",
      "expression": "1/x",
      "parameters": {},
      "excludedPoints": [0]
    }],
    "assumptions": ["x diverso da zero"]
  },
  "presentation": {
    "widthCssPx": 720,
    "heightCssPx": 440,
    "theme": "academic",
    "showLegend": false
  },
  "accessibility": {
    "title": "Funzione reciproca",
    "description": "Due rami separati dall'asintoto verticale x uguale a zero."
  }
}
```

L'esempio sintetico ha sourceRefs vuoto perché non pretende di riprodurre una fonte. Una figura dichiarata source_exact con riferimenti vuoti deve fallire.

## 3. Famiglie obbligatorie

| kind | Modello semantico | Renderer e vincoli |
|---|---|---|
| concept_map | Nodi, relazioni nominate, gerarchie e rimandi | Layout a grafo, porte e archi; cicli ammessi quando significativi |
| function_plot | Espressioni, parametri, dominio, unità, discontinuità | Campionamento controllato, segmenti distinti, assi verificati |
| xy_plot | Serie di dati, unità, incertezze e trasformazioni | Punti/linee/barre compatibili con significato e scala |
| flow_diagram | Passi, decisioni, condizioni e direzione | Simboli coerenti e rami identificati |
| physical_diagram | Corpi, vettori, riferimenti, vincoli geometrici | Primitive deterministiche con convenzioni fisiche |
| chemistry | Sottotipo chimico e struttura/relazioni validate | Renderer specifico per sottotipo |
| source_image | Asset originale, crop, didascalia e provenienza | Riproduzione fedele, raster ammesso |
| composite_figure | Pannelli con ID, scala e relazioni | Composizione di figure già valide |

Tipi chimici da coprire nella versione completa: coordination_complex, electron_count_pathway, catalytic_cycle_organometallic, cyclic_mechanism, reaction_mechanism, trans_effect_diagram e reaction_network, presenti nel sistema precedente. Aggiungere un supporto esplicito a strutture molecolari e curve energetiche quando richiesto dai campioni della materia. Il sottotipo decide lo schema; non basta una stringa generica.

Un convertitore legacy legge i vecchi blocchi json:plot, json:graph, visual-spec e placeholder GRAPH e li porta al contratto nuovo. Importazioni ambigue diventano bozze da verificare. TikZ/Chemfig/raw SVG vecchi non vengono eseguiti o considerati automaticamente affidabili.

## 4. Matematica sicura e corretta

Utilizzare un parser ad AST con lista positiva di nodi, simboli e funzioni. Ammessi: numeri finiti, x e parametri dichiarati, operazioni aritmetiche e funzioni matematiche esplicitamente registrate. Rifiutare assegnazioni, accesso a proprietà, import, definizione di funzioni, stringhe, accesso al sistema e chiamate arbitrarie.

Definire ln come logaritmo naturale e log10 come logaritmo decimale. La grafia ambigua log richiede una convenzione esplicita del profilo o una normalizzazione tracciata. Non fare sostituzioni regex concatenate di nomi di funzione.

Imporre limiti di complessità dell'AST, profondità, numero di campioni e tempo del worker. Una libreria matematica è utile, ma il suo parser non è una sandbox universale: limitarne le capacità e isolare il calcolo. [Sicurezza delle espressioni mathjs](https://mathjs.org/docs/expressions/security.html).

Un campione fuori dominio, infinito o non numerico diventa missing con motivo, mai zero. Spezzare la polilinea sui punti esclusi e sui salti rilevati. Il solo confronto di valori vicini non dimostra continuità: usare anche dominio, singolarità note e campionamento adattivo.

Baseline: 300 campioni, massimo 5.000 per serie; raffinamento dove curvatura o variazione lo richiedono. I valori sono configurabili e devono essere collaudati su 1/x, ln(x), tan(x), radice quadrata, funzione a tratti e oscillazioni. Non promettere fedeltà per frequenze non risolte: segnalare limiti e chiedere dominio migliore.

## 5. Grafici quantitativi

Conservare dataset e trasformazioni indipendenti dal disegno. Ogni serie identifica origine, colonne, unità, conversioni e incertezze. Un modello non inventa punti per rendere la curva regolare.

Assi: label, unità, scala lineare/logaritmica, dominio, tick e orientamento. Scale logaritmiche rifiutano valori non positivi senza trasformazione dichiarata. Gli error bar non compaiono se le incertezze non sono disponibili.

Un grafico digitizzato da immagine conserva calibrazione degli assi e approssimazione; non viene etichettato come dato sperimentale originale. Una curva qualitativa mostra “andamento qualitativo” e non usa tacche numeriche che suggeriscano precisione.

Verificare almeno punti di controllo, monotonia/estremi attesi dove noti, raccordi, unità e coerenza con le formule del capitolo. Per funzioni a tratti rendere distinguibili estremi inclusi/esclusi e valori al bordo.

## 6. Mappe e diagrammi fisici

Le relazioni sono contenuto: “dipende da”, “è un caso di” e “causa” non sono intercambiabili. Il layout non modifica direzione, etichetta o endpoints di un arco. Definire porte e percorsi; impedire che una freccia sembri collegarsi a un nodo diverso.

Una mappa troppo densa si divide in pannelli o sottografi con rimandi espliciti. Non ridurre tutto a caratteri microscopici. Per mappe cicliche mantenere il ciclo e spiegare le retroazioni.

Nei diagrammi fisici, vettori, angoli e versi devono derivare dalla specifica. Distinguere illustrazione non in scala e costruzione geometrica in scala. Una freccia di campo, una forza e una velocità hanno legenda coerente. Le convenzioni verso entrante/uscente dal foglio devono essere nominate.

## 7. Chimica

La semantica include atomi/specie, legami, cariche, geometria, coordinazione, condizioni, passaggi e tipo di freccia. Per conteggi elettronici registrare metodo/convenzione, contributi e somma; per meccanismi, provenienza e grado di certezza. Una formula molecolare non determina da sola la struttura.

Scegliere e bloccare un renderer chimico locale compatibile con questi requisiti, dietro adapter, con fixture manuali. Nessuna dipendenza può essere considerata corretta solo perché rende una molecola plausibile.

Se il renderer non supporta un dettaglio indispensabile, conservare l'immagine della fonte quando disponibile oppure lasciare il finding aperto. Un fallback tipografico può accompagnare la spiegazione, ma non soddisfa automaticamente una figura strutturale richiesta.

## 8. SVG deterministico

Il renderer riceve solo dati validati. Deve emettere viewBox, dimensioni, title, desc e ID stabili per entità significative. Prefissare tutti gli ID di marker/clipPath con visualId/revisione per evitare collisioni tra figure nello stesso documento.

Usare font locali già caricati per misurare testo e formule. Registrare versione renderer, font, layout engine e browser. A parità di input e versioni, SVG e layout devono essere riproducibili, normalizzando metadata non deterministici.

Consentire solo elementi/attributi necessari. Vietare script, handler on*, foreignObject non controllato, riferimenti remoti, CSS importato e URL eseguibili. Anche SVG prodotti localmente passano dal validatore prima dell'inserimento. Il renderer può usare immagini raster solo come asset interni verificati, mai riferimenti di rete arbitrari.

Restituire SVG più manifest geometrico: bounding box di nodi, etichette, formule, frecce e aree riservate. Questo rende il QA controllabile e le patch identificabili.

## 9. Accettazione

Le fixture verificano ln(e) = 1 entro tolleranza numerica, nessun collegamento attraverso x = 0 per 1/x, rifiuto di assegnazioni/accessi globali, formule coerenti con i dati, ID non duplicati, mappa con ciclo e rimando trasversale, tutti i sottotipi chimici richiesti e figura originale raster.

Una figura richiesta resta presente nell'inventario anche se fallisce. Nessun codice SVG/JSON grezzo o placeholder deve comparire in una revisione presentata come definitiva.

