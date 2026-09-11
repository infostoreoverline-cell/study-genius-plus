# E — Interfaccia personale e chiavi API

Obiettivo: Marco deve utilizzare l'applicazione senza modificare codice, `.env` o nomi dei modelli nei sorgenti. Interfaccia in italiano, comandi comprensibili e dettagli tecnici disponibili in un pannello secondario.

## 1. Schermate

| Schermata | Elementi e comportamento |
|---|---|
| Archivio | Ricerca per titolo/materia, ultimi lavori, stato, costo, data, duplicazione, eliminazione con recupero temporaneo |
| Nuovo lavoro | Materia, fonti, ordine, pagine, modalità, argomenti, istruzioni, livello di dettaglio, budget |
| Analisi preliminare | Documenti riconosciuti, pagine effettive, figure candidate, problemi di lettura e intervallo di costo stimato |
| Workspace | Indice, testo, fonti affiancate, avanzamento, budget, pausa/riprendi, lista delle questioni aperte |
| Editor | Anteprima/Markdown, salvataggio di revisione, confronto, correzione di un blocco e rigenerazione mirata |
| Figure | Fonte, candidata corrente, specifica, controlli, cronologia, revisione di layout o contenuto |
| Impostazioni | Provider e chiavi; modelli/ruoli; budget; materie/prompt; cartella dati; backup; diagnostica |

La sidebar rimane utile anche durante una generazione. La UI virtualizza elenchi lunghi e aggiorna l'anteprima dei blocchi modificati, evitando di ricompilare tutto il documento ad ogni token. Si possono chiudere pannelli, usare schermo intero, modificare il titolo e scaricare i risultati, preservando le funzioni presenti nel progetto originale.

## 2. Primo avvio

Il launcher apre una sessione locale. La UI chiede la cartella dati se quella predefinita non è utilizzabile, propone un piccolo progetto dimostrativo senza API e mostra le due schede provider. Il progetto dimostrativo usa dati fissi chiaramente identificati, senza confonderli con risultati del modello.

Configurazione iniziale: materia, lingua italiana, dettaglio matematico esplicito, budget 2 €, limite massimo selezionabile inizialmente 3 €, qualità visuale standard. L'utente può cambiare le impostazioni per singolo lavoro; il job conserva lo snapshot originale.

## 3. Sezione “Provider e chiavi API”

Ogni provider ha nome, etichetta dell'account, campo password per inserimento, pulsanti Salva, Verifica, Sostituisci e Rimuovi. Dopo il salvataggio il campo si svuota. La pagina mostra soltanto “configurata”, data dell'ultima modifica ed esito dell'ultima verifica. Nessun endpoint restituisce il segreto e il browser non lo conserva in localStorage, IndexedDB, sessionStorage o cache service worker.

Stati UI: `non configurata`, `salvata da verificare`, `accesso verificato`, `quota temporaneamente esaurita`, `credito insufficiente`, `chiave non valida`, `modello non disponibile`, `verifica non completata`. Un campo non vuoto non giustifica un indicatore verde.

### Flusso di salvataggio

1. Il browser invia il segreto una sola volta all'API locale, in una richiesta protetta dalla sessione e da verifica Origin.
2. Il backend rifiuta input vuoti, placeholder e lunghezze anomale; non pretende un formato rigido destinato a diventare obsoleto.
3. `SecretStore.put(providerAccountId, secret)` cifra e salva fuori dalla repository. `provider_accounts` conserva soltanto `credential_ref` e `credential_version`.
4. Il salvataggio viene confermato dopo persistenza riuscita. I log escludono body e header della route.
5. Si invalidano tutti i client relativi all'account. Le nuove chiamate leggono la nuova versione. Una richiesta già partita mantiene la versione usata, riportata nel registro senza il valore della chiave.
6. Il riavvio legge il riferimento e decifra tramite SecretStore; non richiede reinserimento ordinario.

### Conservazione Windows

Implementare `SecretStore` con DPAPI in modalità CurrentUser. Un helper Windows usa le API/.NET di protezione dati; il segreto transita su stdin o IPC privato, mai come argomento del processo, testo di comando o variabile stampata. Blob cifrati con ACL dell'utente, scrittura temporanea e sostituzione atomica. Il codice non contiene una chiave di cifratura fissa. [ProtectedData Microsoft](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata?view=windowsdesktop-9.0).

Il test di installazione deve eseguire round-trip di un segreto fittizio, riavvio e verifica delle ACL. DPAPI lega normalmente la decifratura all'identità Windows: il backup destinato a un altro PC richiede il reinserimento delle chiavi. Il backup standard le esclude. Per piattaforme future aggiungere adapter Keychain/Secret Service; se indisponibili, dichiarare il blocco della conservazione permanente o offrire una cassaforte con password dell'utente. Non degradare silenziosamente a testo in chiaro.

## 4. Verifica provider e selezione modelli

Il pulsante Verifica separa accesso ai metadati da test di generazione. La discovery, quando disponibile, non dimostra da sola accesso a un modello né gratuità. Un test sintetico di generazione indica prima il costo massimo e usa un piccolo conto di manutenzione separato dai riassunti, con limite iniziale 0,01 €. Il primo job può invece incorporare il probe necessario nel proprio budget.

Nella pagina Modelli, l'utente sceglie una policy automatica o una scelta per ruolo. Mostrare ID effettivo, capacità richieste, stato, prezzo verificato e data. Una modifica non cambia retroattivamente i job in corso. Un errore 404 di un modello richiede aggiornamento del catalogo; un errore 401 richiede la chiave, non un cambio casuale di modello.

L'eventuale gruppo quota Google si configura per progetto/account. Più chiavi dello stesso progetto non vengono trattate come quote indipendenti. Non è necessario gestire dieci chiavi per il caso d'uso personale.

## 5. Nuovo lavoro e focus assistito

Importare file o trascinare una cartella; escludere file non supportati prima dell'upload. Consentire riordino manuale oltre all'ordinamento naturale. Intervalli riferiti alle pagine fisiche, con anteprima di conferma e possibile numero stampato separato.

Le modalità di contenuto sono Riassunto (sintesi accademica), Completo, Teoria, Esercizi. “Focus assistito” è un flusso di scelta dell'ambito: mostra indice estratto e argomenti, consente selezione ed evidenzia prerequisiti necessari; poi applica una delle quattro modalità. Questo evita che un quinto stato ambiguo sostituisca la profondità didattica.

La preflight locale mostra costo basso/centrale/alto con ipotesi, senza presentarlo come un preventivo certo. Le scansioni ambigue indicano che la stima sarà aggiornata dopo l'estrazione. Il comando Genera crea il job con budget comune all'intera pipeline.

## 6. Correzioni e risultati

“Spiega meglio questo passaggio”, “Correggi questa figura” e “Rivedi questo capitolo” creano task mirati. La UI mostra quali elementi dipendenti saranno ricalcolati e il budget residuo. Le revisioni precedenti rimangono recuperabili. Ripristinare una revisione cambia il puntatore corrente, non cancella la cronologia dei costi.

Ogni lavoro mostra: capitoli pronti, fonti coperte, figure richieste/verificate, punti da rivedere, costo consolidato, in corso e ancora incerto. Le etichette “verificato automaticamente” e “confermato da Marco” restano distinte. Un giudizio del modello non viene chiamato certificazione scientifica.

Completamento: PDF finale soltanto se superati i gate obbligatori. È disponibile un'esportazione “bozza con verifiche aperte” chiaramente etichettata, con elenco dei problemi. Scaricare una versione pronta usa i file già generati e costa zero chiamate IA.

## 7. Errori e accessibilità

Ogni errore contiene la conseguenza e un'azione utile: riprova, modifica intervallo, cambia chiave, attendi quota, libera spazio, riduci ambito. Evitare stack trace nel normale flusso. Dettagli redatti nel pannello diagnostico.

Navigazione da tastiera, focus visibile, etichette dei campi, contrasto sufficiente, stato comprensibile senza colore, formule accessibili e testo alternativo per figure. La modalità scura dell'app non modifica automaticamente la palette stampabile del documento.

## 8. Accettazione

Configurare entrambe le chiavi dalla UI; chiudere e riaprire; completare un lavoro senza modificare file. Verificare con chiavi fittizie che nessun valore compaia in risposte GET, storage browser, bundle, log o backup. Sostituire una chiave e dimostrare che la successiva richiesta usa la nuova versione. Un tab riaperto recupera lavoro, costi e revisioni.
