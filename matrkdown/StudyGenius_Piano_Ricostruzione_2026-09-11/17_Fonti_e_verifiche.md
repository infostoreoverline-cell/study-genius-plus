# P — Fonti, metodo di verifica e prove riproducibili

Data: 11 settembre 2026. Questo file accompagna l'audit 01 e separa osservazioni sul codice, informazioni esterne e scelte progettuali.

## 1. Repository analizzata

[Repository Study Genius](https://github.com/infostoreoverline-cell/study_genius), branch main, commit f27ee7e2bff9ea6327be9891905e23500a0f1e91. Commit datato 10 settembre 2026, 20:11:51 UTC.

Inventario: 17.591 file versionati. Sono stati acquisiti 177 file testuali selezionati di codice, configurazione, prompt, test, specifiche ed esempi, per 2.696.065 byte. Tutti i contenuti acquisiti corrispondevano all'hash del blob Git indicato nell'albero. I 73 file di src sono mappati singolarmente nel documento 02.

I file generati, le dipendenze versionate, i checkpoint e le sessioni sono stati inventariati; non è stata eseguita una lettura integrale di tutte le loro versioni. Nessuna lettura del file di segreti e nessuna chiamata a pagamento. Il piano non afferma che l'intera applicazione sia stata avviata o che tutte le sessioni storiche siano state validate.

## 2. Materiale delle prove nel pacchetto ZIP

La cartella prove/ contiene:

| File | Uso |
|---|---|
| [source-manifest.json](prove/source-manifest.json) | Percorsi dei 177 file, dimensioni, hash Git e SHA-256 |
| [verification-results-observed.json](prove/verification-results-observed.json) | Esiti dei 123 controlli sintattici e delle due suite originali tentate |
| [probe-results-observed.json](prove/probe-results-observed.json) | Risultati osservati delle dieci prove isolate |
| [probes.cjs](prove/probes.cjs) | Runner riproducibile con dipendenze simulate e controllo degli hash |
| [validation-report.json](prove/validation-report.json) | Controlli di integrità del pacchetto documentale, distinti dai test dell’app |

I moduli originali della repository non vengono duplicati nel pacchetto. Per riprodurre, usare una copia del commit indicato cui l'utente ha accesso. Il runner confronta l'hash dei moduli caricati con il manifest e rifiuta sorgenti differenti.

Il runner usa solo moduli integrati in Node per sé e mock per le dipendenze dei moduli esaminati. Non installa o invoca SDK esterni e non effettua richieste di rete. La VM isola il contesto della prova; non viene presentata come sandbox per eseguire sorgenti arbitrari non attendibili.

## 3. Prove effettivamente eseguite

| Verifica | Esito osservato | Limite |
|---|---|---|
| Hash dei contenuti acquisiti | 177 corrispondenze, zero differenze | Riguarda il sottoinsieme testuale acquisito |
| Risoluzione strutturale import locali src | Percorsi risolti | Non certifica gli export né l'esecuzione dei rami |
| node --check sui JavaScript acquisiti | 122 validi, 1 errore | Parsing, non comportamento |
| test_schemas_contracts.js | Codice uscita 1 | Bloccato nel parsing prima delle asserzioni |
| test_visual_reading_contract.js | Codice uscita 1 | Stesso errore sintattico |
| Dieci probe isolate | Tutte riproducono le condizioni difettose attese | Servizi esterni simulati, nessun end-to-end |

L'errore sintattico è in StudyGenius/src/core/schemas.js, riga 303: Unexpected token ':'. La proprietà appartiene a un blocco chimico non correttamente racchiuso nella dichiarazione circostante. Il controllo è stato eseguito con Node v24.19.0.

## 4. Risultati delle prove isolate

| Prova | Stimolo | Risultato osservato |
|---|---|---|
| P01 | Export usati da configRoutes | Quattro funzioni attese assenti da promptService |
| P02 | safeEvaluateMath con ln(e) | 0, anziché 1 |
| P03 | 1/x in x=0 | 0, anziché valore non definito/gap |
| P04 | Espressione con assegnazione di un marcatore innocuo | Il marcatore globale della VM diventa 7 |
| P05 | Testo contenente soltanto Gauss | verified=true e coverage=1 |
| P06 | transitionPhase con NON_EXISTENT_PHASE | La fase viene accettata |
| P07 | Critic restituisce passed=false e una formula errata | Il report applicativo segna tutti i critic passed=true |
| P08 | Registra/accetta una figura, poi reset/get | Un elemento prima; zero dopo |
| P09 | Valutazione con score=100 e un errore critico | optimizeDiagram restituisce passed=true |
| P10 | Errore di rete nella revisione finale | approved=true e score=90 |

P06 sostituisce soltanto la validazione iniziale dello schema, perché il modulo schemas originale non si carica; transitionPhase resta la funzione originale. P09 simula renderer, geometria e provider per isolare il gate finale. P10 simula l'errore di rete. P04 modifica esclusivamente un marcatore nel contesto di prova.

Queste prove accertano difetti specifici. Non dimostrano che ogni input reale percorra gli stessi rami, né che tutti gli output già prodotti siano errati. Il blocco sintattico va superato prima che i percorsi latenti possano essere raggiunti nell'app completa.

## 5. Come riprodurre senza modificare il vecchio progetto

Creare una copia separata della repository al commit indicato, senza intervenire sui propri lavori aperti. Verificare con git rev-parse HEAD che il commit corrisponda. Se il checkout altera le terminazioni di riga, gli hash dei byte cambiano: usare i contenuti originali dello snapshot, senza modificare quelli del progetto operativo.

Dal pacchetto estratto, in PowerShell:

```powershell
node .\prove\probes.cjs "C:\percorso\study_genius\StudyGenius"
```

Sostituire il percorso con la copia locale esatta. Il runner scrive prove/probe-results-reproduced.json, lasciando intatto il file observed. Un codice uscita 0 significa che le asserzioni della riproduzione dei difetti sono soddisfatte; non significa che il progetto sia corretto.

Per controllare il singolo errore sintattico:

```powershell
node --check "C:\percorso\study_genius\StudyGenius\src\core\schemas.js"
```

Per le due suite originali, da una copia di lavoro con dipendenze disponibili e rispettando lo snapshot:

```powershell
node .\tests\test_schemas_contracts.js
node .\tests\test_visual_reading_contract.js
```

Non correggere automaticamente i moduli originali per far diventare verdi queste prove. Le regressioni del nuovo software devono invece verificare il comportamento corretto: ln(e)=1, fase invalida respinta, nessuna approvazione in caso di rete assente.

## 6. Fonti ufficiali sui provider

| Fonte | Informazioni usate nel piano |
|---|---|
| [Google: prezzi](https://ai.google.dev/gemini-api/docs/pricing) | Tariffe Standard, valute, thinking e scadenza promozionale |
| [Google: rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) | Quote per progetto, dimensioni di limite e reset |
| [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) | Capacità, contesto, uscita e livelli di thinking |
| [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) | Capacità e limiti documentati |
| [Google: generazione testo](https://ai.google.dev/gemini-api/docs/text-generation) | SDK e interfaccia corrente da collaudare nell'adapter |
| [Google: structured output](https://ai.google.dev/gemini-api/docs/structured-output) | Schema di risposta e adattamento al formato del servizio |
| [Google: document processing](https://ai.google.dev/gemini-api/docs/document-processing) | Gestione dei documenti da integrare con provenienza locale |
| [DeepSeek: documentazione iniziale](https://api-docs.deepseek.com/) | Endpoint, modelli documentati e avviso di instradamento |
| [DeepSeek: listino ufficiale in cinese](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) | Prezzi CNY, finestre orarie e capacità |
| [DeepSeek: visione](https://api-docs.deepseek.com/guides/vision/) | Ingresso di immagini per il modello compatibile |

Alcune pagine inglesi di dettaglio DeepSeek non erano recuperabili durante la ricerca; per il listino è stata consultata la pagina ufficiale in cinese. Questo è il motivo per cui i prezzi DeepSeek sono espressi in CNY. Non sono stati trasformati in presunti prezzi USD dell'account.

I valori sono una fotografia documentale alla data del piano. La disponibilità del singolo account, la compatibilità dell'SDK installato e il comportamento effettivo richiedono le prove M05/M14. Nessuna promessa di accesso gratuito o di stabilità indefinita degli alias.

## 7. Fonti ufficiali dell'infrastruttura

| Fonte | Decisione supportata |
|---|---|
| [Node: release precedenti e stato](https://nodejs.org/en/about/previous-releases) | Selezione di Node 24 LTS, con patch da fissare |
| [SQLite WAL](https://www.sqlite.org/wal.html) | Uso locale, concorrenza e attenzione alle scritture |
| [SQLite Online Backup](https://www.sqlite.org/backup.html) | Snapshot coerente del database attivo |
| [Microsoft ProtectedData](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata?view=windowsdesktop-9.0) | Adapter DPAPI per segreti Windows |
| [MathJax locale](https://docs.mathjax.org/en/latest/web/hosting.html) | Asset matematici disponibili senza CDN |
| [Playwright PDF](https://playwright.dev/docs/api/class-page#page-pdf) | Esportazione tramite browser controllato |
| [mathjs: sicurezza](https://mathjs.org/docs/expressions/security.html) | Necessità di restringere e isolare le espressioni |

React, Express, SQLite driver, layout engine e renderer chimico sono scelte progettuali da risolvere in versioni concrete nel bootstrap. La citazione di una documentazione non costituisce un test di compatibilità dell'intero stack.

## 8. Decisioni, ipotesi e cose ancora da misurare

**Deciso per il prodotto:** uso personale locale, UI in italiano, Google e DeepSeek, chiavi persistenti dalla UI, budget per lavoro, provenienza, passaggi matematici espliciti, SVG deterministici con revisione, esportazioni e ripresa.

**Scelte tecniche proposte:** Windows x64 iniziale, monolite modulare TypeScript, SQLite, 1 job attivo e 2 chiamate IA globali, limiti conservativi di upload/render, DPAPI e renderer condiviso.

**Da misurare durante l'implementazione:** prestazioni sul PC, precisione dei parser/OCR, qualità dei modelli sui materiali di Marco, costo effettivo dei diversi compiti, compatibilità dei binari, impaginazione completa e correttezza dei renderer chimici.

Il costo dell'esempio nel documento 09 è un calcolo con cambi ipotetici, non una quotazione o una misura. Il piano è completo come specifica di lavoro; il codice della nuova applicazione e i suoi collaudi restano da realizzare.

