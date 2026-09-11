# D — API, coda persistente e ripresa

Dipendenze: 03, 04 e 09. La UI invia comandi; il backend possiede stato e autorizzazioni; i worker eseguono task con input immutabili.

## 1. Regole HTTP comuni

Base `/api/v1`, salvo `/health/live` e `/health/ready` alla radice per il launcher. Validazione di route, query, body e limiti dimensionali prima del servizio. Risposta positiva `{data, requestId}`; errore `{error:{code,message,retryable,details},requestId}`. `details` contiene solo informazioni utilizzabili dalla UI e prive di segreti.

Usare 400 per input sintatticamente invalido, 401 per sessione locale assente, 403 per azione/origine non consentita, 404 per risorsa assente, 409 per conflitto di revisione/stato, 413 per dimensione, 422 per impossibilità semantica, 429 per backpressure HTTP e 500 per errore inatteso. Un 429 remoto è un evento del task, non necessariamente un 429 della UI.

I comandi che possono duplicare un lavoro richiedono `Idempotency-Key`. Il server conserva chiave, hash della richiesta e risultato; stessa chiave e body differente restituiscono 409. L'idempotenza applicativa non garantisce quella dei provider esterni.

## 2. Superficie API obbligatoria

| Metodo e percorso | Input / output essenziale |
|---|---|
| `GET /health/live`, `/health/ready` | Processo vivo; database e dipendenze locali pronti. Nessuna chiamata IA |
| `POST /session/bootstrap` | Token monouso del launcher → cookie di sessione locale |
| `GET/POST /projects` | Elenco / creazione con titolo e profilo materia |
| `GET/PATCH/DELETE /projects/:id` | Dettaglio, revisione attesa, eliminazione logica |
| `GET/POST /subjects` | Profili predefiniti e personalizzati |
| `GET/PUT /subjects/:id/profile` | Profilo completo con revisione attesa |
| `POST /documents` | Upload streaming → documentId, hash e stato validazione |
| `POST /local-files/pick`, `POST /documents/import-local` | Selettore nativo del launcher → grant monouso → importazione controllata, senza percorsi arbitrari dal modello |
| `POST /projects/:id/documents` | Associa documenti, ordine e intervalli |
| `GET /documents/:id/pages` | Manifest pagine/slide, estrazione, incertezze |
| `GET /documents/:id/pages/:pageIndex/preview` | Anteprima della pagina autorizzata |
| `GET /source-units/:id`, `PUT /source-evidence/:id` | Lettura fonte / correzione versionata dell'evidenza con invalidazione |
| `POST /projects/:id/preflight` | Analisi locale e stima preliminare senza IA |
| `POST /jobs` | GenerationRequest → job in DRAFT con snapshot |
| `POST /jobs/:id/start` | Capienza budget e provider verificati → QUEUED |
| `GET /jobs/:id` | Snapshot aggiornato, fase, costi, azioni disponibili |
| `GET /jobs/:id/events` | SSE con replay dal sequence richiesto |
| `POST /jobs/:id/pause` | Pausa esplicita: non assegnare altri task |
| `POST /jobs/:id/resume` | Riprendi ciò che manca, con condizioni rivalidate |
| `POST /jobs/:id/cancel` | Interrompi e conserva artifact e costi già sostenuti |
| `GET/PUT /jobs/:id/plan` | Piano e modifiche controllate con invalidazione |
| `POST /jobs/:id/budget` | Modifica del tetto con versione attesa e audit |
| `GET /budget-accounts/:id/entries`, `POST /provider-calls/:id/reconcile` | Registro costi / riconciliazione documentata di esito incerto |
| `GET /jobs/:id/reports`, `GET /document-revisions/:id` | Rapporti con hash e documento esatto da mostrare/esportare |
| `GET /jobs/:id/chapters` | Revisioni correnti e stato di ciascun capitolo |
| `PUT /chapters/:id/content` | AST/Markdown modificato, revisione attesa |
| `POST /chapters/:id/revise` | Istruzione mirata → task, stesso budget del lavoro |
| `GET /visuals/:id`, `GET /visuals/:id/history` | Spec, candidate, evidenze, QA e revisioni |
| `POST /visuals/:id/revise` | Correzione mirata di layout o contenuto |
| `POST /exports` | Job, revisione, formato, modalità final/draft → export task locale |
| `GET /exports/:id`, `GET /exports/:id/download` | Stato e file soltanto se ready |
| `GET/PUT /settings` | Preferenze non segrete e revisione |
| `GET /providers` | Metadati e stato redatto, nessun valore di chiave |
| `PUT/DELETE /providers/:provider/credentials` | Salvataggio/sostituzione/rimozione del segreto |
| `POST /providers/:provider/check` | Verifica credenziali/capacità, con modalità del test esplicita |
| `POST /providers/:provider/refresh-models` | Discovery, cambiamenti rilevati e metadati |
| `GET/PUT /models`, `GET/PUT /routing-policy` | Catalogo capacità e selezione per ruolo, con versioni |
| `GET/PUT /pricing` | Catalogo locale versionato con provenienza e validità |
| `POST /backups`, `GET /backups` | Backup locale e suo stato |
| `POST /restores/validate`, `/restores/apply` | Verifica archivio; restore con stato e snapshot di protezione |
| `POST /legacy-imports` | Anteprima/importazione non distruttiva delle sessioni vecchie |

Documentare queste route in OpenAPI e generare il client. Le route di scrittura non accettano percorsi assoluti dal modello o dalla UI ordinaria. I file vengono risolti da ID server-side.

La selezione di un file locale più grande del limite upload richiede una scelta esplicita nel dialogo nativo del launcher. Il server riceve un grant breve per quel file, controlla tipo, dimensioni, spazio e identità del file all'apertura, poi lo legge in streaming con i limiti di estrazione. Non esporre un endpoint generico “leggi questo percorso”. Nella versione iniziale le route credenziali identificano l'account attivo di quel provider; una futura gestione multiaccount aggiunge accountId espliciti senza cambiare il SecretStore.

## 3. Stati di lavoro

Stati canonici: `DRAFT`, `QUEUED`, `RUNNING`, `PAUSING`, `PAUSED`, `WAITING_BUDGET`, `WAITING_PROVIDER`, `NEEDS_REVIEW`, `CANCEL_REQUESTED`, `CANCELLED`, `FAILED`, `COMPLETED`.

| Stato | Transizioni principali consentite |
|---|---|
| DRAFT | QUEUED, CANCELLED |
| QUEUED | RUNNING, PAUSED, CANCELLED, WAITING_BUDGET, WAITING_PROVIDER |
| RUNNING | PAUSING, WAITING_BUDGET, WAITING_PROVIDER, NEEDS_REVIEW, CANCEL_REQUESTED, FAILED, COMPLETED |
| PAUSING | PAUSED, CANCEL_REQUESTED, FAILED |
| PAUSED / WAITING_BUDGET / WAITING_PROVIDER / NEEDS_REVIEW | QUEUED dopo risoluzione, CANCELLED |
| CANCEL_REQUESTED | CANCELLED dopo chiusura/riconciliazione, FAILED se arresto locale non recuperabile |
| FAILED | QUEUED solo tramite recupero esplicito e rivalidazione; CANCELLED |
| COMPLETED / CANCELLED | Terminali; una revisione successiva crea un nuovo job collegato |

La revisione o continuazione di un lavoro mantiene per default lo stesso `budgetAccountId`, anche quando crea un job figlio. Un “nuovo progetto/lavoro indipendente” crea un altro conto soltanto con azione esplicita della UI.

Le transizioni dirette a PAUSED/CANCELLED richiedono assenza di task locali ancora attivi. Se ci sono chiamate in corso, passare prima da PAUSING/CANCEL_REQUESTED e conservare gli eventuali costi incerti. Il comando dell'utente prevale sui callback tardivi: una risposta può essere archiviata e contabilizzata senza promuovere il risultato di un job annullato.

Fasi canoniche separate dallo stato: `EXTRACT_TEXT`, `EXTRACT_EVIDENCE`, `BUILD_PLAN`, `GENERATE_CHAPTERS`, `VERIFY_CHAPTERS`, `COMPILE_VISUALS`, `VERIFY_VISUALS`, `ASSEMBLE_DOCUMENT`, `VERIFY_DOCUMENT`. L'export ha task propri. Un job può essere `WAITING_PROVIDER` in `EXTRACT_EVIDENCE`; il campo fase non viene sostituito da un nome inventato.

## 4. Dipendenze e checkpoint

Ogni task ha `{kind,inputHash,dependencies,state,attempt,leaseOwner,leaseUntil}`. Stati di task: BLOCKED, READY, RUNNING, SUCCEEDED, FAILED, CANCELLED. Un task BLOCKED conserva la causa e le condizioni per tornare READY. Una prenotazione atomica seleziona un task pronto e gli assegna una lease. Due worker non devono eseguire contemporaneamente lo stesso task. Allo scadere della lease, distinguere task locali ripetibili da richieste remote con esito ambiguo.

Checkpoint obbligatori: documento validato; pagina estratta; evidenza accettata; piano; blocco/capitolo completo; risposta provider persistita; candidata visuale; report; documento assemblato; export. Uno stream parziale viene conservato con stato `partial`, mai come capitolo completo. Checkpoint delle porzioni ricevute ogni circa 2 secondi o 16 KiB, valori configurabili, senza sincrone scritture ad ogni token.

Chiave task: hash di tipo, revisioni sorgenti, profilo, prompt, modello configurato, parametri e versione del produttore. Prima di una chiamata, cercare una risposta completa già salvata per quello stesso task/tentativo. Dopo la chiamata, salvare risposta e usage prima di applicare trasformazioni costose. La ripresa non reinvia automaticamente richieste già concluse.

## 5. Eventi e ricostruzione UI

Un evento SSE contiene `id: sequence` e payload `{jobId,sequence,type,at,data}`. Tipi minimi: `job.state_changed`, `task.started`, `task.progress`, `chapter.partial`, `chapter.ready`, `visual.updated`, `budget.changed`, `review.required`, `job.completed`, `job.failed`. La UI ordina e deduplica per sequence.

Il progresso usa quantità significative: pagine analizzate/totali, requisiti coperti/totali, capitoli pronti/pianificati, figure verificate/richieste. Se il piano cambia, l'eventuale variazione del denominatore è spiegata. Non usare una percentuale che arriva a 100 prima di revisione ed assemblaggio.

Alla riconnessione, il client richiede prima lo snapshot e poi il replay dalla sequence nota. Se gli eventi sono stati compattati, riceve `resync_required` e ricarica lo snapshot. Heartbeat ogni 15 secondi. Chiudere una connessione SSE rimuove soltanto l'abbonamento; non equivale a pausa o cancellazione del lavoro.

## 6. Retry e arresto

Classificare errori in autenticazione, parametro, modello ritirato, quota breve, quota giornaliera, credito, indisponibilità, rete ed esito ambiguo. Il gateway gestisce massimo 3 tentativi fisici per task remoto come valore iniziale; retry dell'SDK disattivati. Nessuna cascata indipendente può moltiplicare i tentativi.

Pausa: smette di assegnare task, lascia finire quelli brevi; richiede abort di uno stream se l'utente vuole arresto immediato. Cancel: annulla il lavoro residuo, chiude le risorse e registra eventuali addebiti pendenti. Il costo non diventa zero per il solo abort client.

Offline o quota esaurita: `WAITING_PROVIDER`, causa e momento di retry, se noto. Il dispatcher può riprovare dopo un intervallo definito finché l'app è aperta; niente timer persi soltanto in memoria. Su PC sospeso, al risveglio confrontare deadline e lease con l'orologio corrente.

## 7. Accettazione

Due click su Genera producono un solo job; due worker non raddoppiano il task; chiusura tab e riavvio riprendono la stessa versione; lo stream interrotto non diventa completo; una risposta tardiva di un job cancellato non sovrascrive la revisione corrente; il replay degli eventi ricostruisce lo stesso stato; cambiando la fonte vengono invalidati tutti e soli i task dipendenti.
