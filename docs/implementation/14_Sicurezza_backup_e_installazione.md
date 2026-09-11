# M — Sicurezza locale, backup e installazione

Dipendenze: 03–06, 09, 13. Il caso d'uso è personale e locale: bastano controlli mirati, senza introdurre un sistema aziendale multiutente.

## 1. Sessione sul PC

Il server ascolta solo su 127.0.0.1. Una richiesta deve avere Host previsto e, per operazioni mutanti, Origin esatto e protezione CSRF. Il frontend compilato e le API condividono origine. CORS aperto non serve.

Il launcher genera un segreto casuale di bootstrap, valido una volta e per breve tempo. Può aprire il browser con il segreto nel fragment dell'URL; la pagina lo scambia con una sessione locale e rimuove immediatamente il fragment dalla cronologia. Il server valida anche l'origine di questo scambio e invalida il token dopo l'uso.

La sessione usa cookie HttpOnly e SameSite=Strict, senza Domain; configurare Secure solo in presenza di HTTPS effettivo. Non dichiarare HTTPS se si usa HTTP loopback. Il bootstrap non deve comparire nei log. Un secondo avvio può emettere un nuovo invito locale breve tramite IPC autenticato all'istanza, senza esporre il segreto permanente in un file pubblico.

Validare tutte le route, compresi download, SSE, impostazioni, backup e cancellazioni. Le sole health route del launcher possono rispondere prima della sessione con un booleano/stato minimale, senza percorsi, configurazioni o dati; lo scambio bootstrap richiede il token monouso anche se non esiste ancora il cookie. Nessuna route resta aperta perché il sito è “solo sul mio PC”. Questo riduce il rischio che una pagina esterna comandi il servizio locale. Non protegge da malware già eseguito come lo stesso utente Windows.

## 2. Chiavi e dati inviati

Implementare il SecretStore del documento 06 con DPAPI CurrentUser. Un account Windows diverso non deve decifrare i blob. Il backup standard esclude segreti e sessioni; spostarsi su un altro PC richiede reinserire le chiavi dalla UI. [ProtectedData Microsoft](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata?view=windowsdesktop-9.0).

La schermata Provider spiega quali dati vengono inviati per ciascun compito. Conservazione locale non significa elaborazione IA offline. Le chiamate partono solo verso il provider selezionato, con le evidenze necessarie.

I documenti non possono definire endpoint, leggere chiavi, chiedere tool o eseguire istruzioni di sistema. Il loro testo viene passato come fonte non attendibile, distinto dalle istruzioni applicative. Per questa app gli adapter non espongono tool generici di filesystem o shell al modello.

## 3. File e rendering

Identificatori opachi nelle API e risoluzione dei percorsi sul server. Canonicalizzare il percorso e verificarne l'appartenenza alla directory ammessa; evitare attraversamenti, symlink/junction fuori radice, nomi riservati Windows e archivi con path assoluti.

Upload su disco con limiti di byte reali; decompressione con limiti su numero voci, dimensione espansa e rapporto di compressione. Le password dei documenti sono temporanee e non nei log.

HTML/SVG sanitizzati con allowlist; immagini verificate per tipo e dimensioni; parser XML senza entità esterne. Il renderer non naviga verso URL di fonte. Bloccare richieste di rete non necessarie nel contesto di stampa; i font e gli asset sono locali.

Processi di conversione con argomenti fissi e spawn senza shell. Nessun nome di file o testo del modello concatenato in una riga di comando. Il valutatore matematico segue 11.

## 4. Log e diagnostica

Log JSON con timestamp, livello, correlationId, jobId/taskId/callId, codice errore, durata e metadati minimi. Redigere chiavi, header, token di sessione, password e percorsi personali dove non necessari.

Per impostazione predefinita niente testo integrale delle fonti nei log. Un pacchetto diagnostico selezionabile include versione app, catalogo, stato task e stack trace redatti; prima dell'esportazione mostra cosa contiene. Non inviarlo automaticamente a qualcuno.

Rotazione iniziale: massimo 10 file da 10 MiB e conservazione 14 giorni, configurabili. Gli eventi economici restano nel database con il ledger, indipendentemente dalla rotazione dei log.

## 5. Backup coerente

Il backup comprende database consistente, blob referenziati, profili, impostazioni non segrete e manifest degli hash. Per SQLite attivo usare Online Backup API o strategia equivalente collaudata; copiare solo il file .sqlite mentre ci sono scritture/WAL non è una procedura sufficiente. [SQLite Online Backup](https://www.sqlite.org/backup.html).

Procedura:

1. Creare record backup IN_PROGRESS.
2. Ottenere snapshot consistente del database.
3. Leggere da quello snapshot l'elenco dei blob da includere.
4. Impedire al garbage collector di rimuoverli durante la copia.
5. Copiare gli artifact immutabili e verificare hash.
6. Scrivere manifest con versione schema/app e conteggi.
7. Provare apertura/integrità su una directory temporanea.
8. Promuovere il backup a VERIFIED soltanto dopo il controllo di restore previsto.

Un backup interrotto non appare utilizzabile. Cifratura dell'intero backup con password è un'opzione futura; non inventare crittografia proprietaria. Per l'uso iniziale consigliare una directory/disco scelto dall'utente, con spazio e accessi controllati.

Pianificazione locale: backup al primo avvio del giorno o dopo modifiche significative, conservazione iniziale 7 giornalieri e 4 settimanali, entro quota configurabile. Se il PC/app è spento, nessuna promessa di backup eseguito. La UI mostra ultimo backup verificato e data.

## 6. Ripristino

Ripristinare in una nuova directory; validare hash, integrità SQLite, versione schema e dipendenze. Arrestare ordinatamente i worker e creare un backup preventivo dell'archivio corrente. Solo dopo esito positivo cambiare il puntatore alla directory dati.

Il ripristino di un vecchio backup non può dimenticare addebiti avvenuti dopo quello snapshot. Se esiste il ledger corrente, conservarlo e riconciliare per callId senza doppioni prima di riattivare chiamate. Se il ledger più recente è perduto, marcare il costo potenzialmente successivo come sconosciuto e richiedere riconciliazione del lavoro con il provider. Non presentare automaticamente il vecchio residuo come denaro disponibile.

I job con invii in corso al momento del backup diventano recuperabili con chiamate UNCERTAIN. Non ripeterli ciecamente. Riattivare le chiavi dalla UI se mancanti o non decifrabili.

Il restore deve poter essere annullato ripuntando alla directory precedente finché non iniziano nuove attività; dopo nuove attività serve riconciliazione, non semplice sostituzione di file.

## 7. Installazione e avvio

Due percorsi distinti:

- Sviluppo: Node 24 LTS fissato, repository nuova, npm ci, build e comandi documentati.
- Uso ordinario: cartella/release locale con runtime e asset compatibili oppure installer che li prepara una volta, launcher Avvia/Chiudi e guida breve. L'utente non modifica codice o segreti nei file.

Il bootstrap verifica Windows/architettura, spazio, runtime, driver SQLite, Chromium, font, SecretStore e conversioni opzionali. Scaricamenti iniziali dichiarati; nessuna GPU necessaria. Generazione API disponibile con rete; archivio e download di revisioni pronte verificati offline.

Le dipendenze native e i browser devono avere checksum/versione nel manifest. Se un antivirus impedisce l'avvio, produrre diagnostica dell'errore senza chiedere di disattivare globalmente le protezioni.

La cartella dati è separata dalla release: reinstallare il programma non elimina appunti e chiavi.

## 8. Aggiornamenti e migrazioni

Ogni release contiene versione app, schema database, versioni contratti e migrazioni numerate. Prima di migrare: backup verificato, spazio disponibile e blocco dei job. Una migrazione fallita lascia l'archivio precedente recuperabile.

Non consentire a un binario vecchio di aprire in scrittura uno schema più nuovo. Il rollback di codice dopo migrazione richiede un percorso dati compatibile e riconciliazione degli addebiti; non sovrascrivere il database con un backup senza considerare i costi successivi.

Catalogo modelli, prezzi e profili possono aggiornarsi senza release di codice, purché rispettino schema e validità. L'aggiornamento è visibile e non modifica job già avviati.

## 9. Importazione facoltativa dell'archivio vecchio

La ricostruzione parte da zero; l'importazione dei vecchi appunti è una comodità separata e non un prerequisito. Leggere session JSON e Markdown come dati, in modalità dry-run iniziale. Mostrare titoli, file, duplicati e risorse mancanti.

Non importare node_modules, .env, cache globali, client SDK, ledger non riconciliati o stato esecutivo vecchio. I vecchi appunti entrano come documenti legacy non verificati, con provenance originale quando ricostruibile. Le figure prive di fonti o contratti validi non diventano automaticamente accettate.

## 10. Cancellazione e manutenzione

Eliminazione logica con cestino temporaneo; cancellazione fisica tramite collector dei blob non referenziati. Conservare i registri economici necessari a non duplicare spese, anche se il testo viene rimosso. Backup e revisioni condivise impediscono la rimozione di un blob ancora necessario.

La UI mostra spazio per fonti, artifact, export, temporanei e backup. Pulizia interrompibile; mai eliminare file appartenenti a task attivi. Spostamento della directory dati solo a worker fermi, con copia verificata e possibilità di ritorno.

## 11. Accettazione

PC pulito: installazione, avvio, chiavi dalla UI e riavvio. Test di pagina esterna che tenta una chiamata locale, path traversal, SVG attivo e archivio espansivo. Backup durante lavoro, spegnimento simulato, restore in cartella nuova e confronto degli hash. Un backup vecchio non riapre un budget già consumato.

