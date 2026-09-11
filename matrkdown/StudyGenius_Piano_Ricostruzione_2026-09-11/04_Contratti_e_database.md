# C — Contratti dati, revisioni e persistenza

Questo è il riferimento comune per backend, UI, worker, modelli e renderer. I nomi dei campi sono proposti come contratto della versione nuova. Qualunque variazione deve aggiornare schema, migrazione, client e test nella stessa modifica.

## 1. Convenzioni

- ID delle entità persistenti come UUID opachi; nomi visualizzati separati dai percorsi fisici. Gli ID interni a una specifica o rapporto, per esempio nodi/serie/findings, possono essere stringhe stabili e univoche nel relativo namespace.
- `schemaVersion` presente in ogni documento serializzato. Oggetti strict: campi sconosciuti rifiutati ai confini, salvo sezioni `extensions` esplicite.
- Timestamp UTC ISO 8601. Orari commerciali accompagnati dalla timezone IANA del provider.
- Hash SHA-256 sui byte o su JSON canonico; dichiarare sempre quale dei due.
- Importi persistenti come interi in micro-unità, oppure decimali a precisione fissa. Mai float binari per il libro dei costi. Una micro-unità EUR vale 0,000001 €.
- Coordinate di fonte: `pageIndex` zero-based, numero PDF umano `pageIndex+1`, eventuale `printedPageLabel` separata. `bbox` in coordinate normalizzate `[x,y,w,h]` con origine in alto a sinistra dopo rotazione normalizzata.
- Ogni revisione è immutabile. Modificare significa creare una nuova revisione e cambiare il riferimento “corrente”.

## 2. Entità del database

| Tabella | Campi essenziali | Vincoli |
|---|---|---|
| `projects` | id, title, subject_profile_id, created_at | Un archivio può contenere più progetti della stessa materia |
| `subject_profiles` | id, name, discipline, revision_id | Materie predefinite e personali |
| `profile_revisions` | id, profile_id, instructions_json, hash | Revisione usata dal job fissata |
| `documents` | id, original_name, media_type, blob_hash, byte_size | Hash non sostituisce l'identità dell'importazione |
| `project_documents` | project_id, document_id, order_index, selected_ranges_json | Ordine esplicito e intervalli validati |
| `source_selection_revisions` | id, project_id, selection_json, hash | Snapshot immutabile di fonti, ordine e intervalli |
| `generation_requests` | id, project_id, request_json, hash | Contiene GenerationRequest risolta; jobs.request_revision_id la riferisce |
| `source_units` | id, document_id, page_index, kind, text, bbox_json, hash, extraction_status | Segmenti per pagina, formula, tabella, esercizio o figura |
| `source_evidence` | id, source_unit_id, representation_json, provenance, uncertainties_json | Nessuna certezza implicita su OCR ambiguo |
| `jobs` | id, project_id, request_revision_id, status, stage, budget_account_id, version | Snapshot immutabile di fonti e impostazioni |
| `tasks` | id, job_id, kind, state, input_hash, attempt, lease_owner, lease_until | Dipendenze in `task_dependencies`; idempotency key univoca |
| `job_events` | job_id, sequence, type, payload_json, created_at | Unique(job_id, sequence), append-only |
| `plans` | id, job_id, revision, json, hash | Capitoli, obiettivi, esclusioni e copertura |
| `concepts` / `concept_edges` | id, project_id, content_json; from_id, to_id, relation | Cicli ammessi solo nelle relazioni che li prevedono |
| `chapter_revisions` | id, job_id, chapter_id, revision, ast_json, hash, status | Block ID persistenti durante repair |
| `block_revisions` | id, chapter_revision_id, block_id, revision, ast_pointer, hash | Indice dei blocchi dell'AST del capitolo; niente seconda copia modificabile del contenuto |
| `block_sources` | block_revision_id, source_unit_id, relation | Relazioni supporto, citazione, derivazione, integrazione |
| `document_revisions` | id, job_id, chapter_revision_ids_json, assembly_json, hash, status | Ordine, numerazione e riferimenti; materializzazione deterministica dell'AST completo |
| `visual_revisions` | id, job_id, visual_id, revision, spec_json, spec_hash, state | Revisione scientifica distinta dal layout |
| `artifacts` | id, kind, blob_hash, producer_version, input_hash, status | Unique(kind, input_hash, producer_version) quando deterministico |
| `artifact_dependencies` | artifact_id, dependency_type, dependency_id, dependency_hash | Invalidazione transitiva |
| `review_reports` | id, target_revision_id, target_hash, reviewer, verdict, findings_json | Report valido soltanto per hash corrispondente |
| `exports` | id, job_id, document_revision_id, format, artifact_id, status | Una revisione pronta produce export ripetibili |
| `provider_accounts` | id, provider, label, quota_group_id, credential_ref, credential_version | Nessuna chiave in chiaro |
| `model_catalog` / `price_snapshots` | provider, model_id, version, capabilities_json; tariffs_json, validity | Catalogo e tariffe versionati separatamente |
| `budget_accounts` | id, cap_eur_micro, settled_eur_micro, reserved_eur_micro, uncertain_eur_micro | Aggiornamenti atomici |
| `provider_calls` | id, task_id, request_hash, model, price_snapshot_id, status, usage_json | Una riga per tentativo fisico |
| `budget_entries` | id, call_id, event_type, amounts_json, created_at | Audit append-only con riconciliazione |
| `settings` | key, revision, value_json | Esclude segreti; aggiornamenti con compare-and-swap |
| `backups` | id, manifest_hash, artifact_id, status | `VERIFIED` dopo integrità e verifica restore |
| `idempotency_records` | scope, key, request_hash, response_json, created_at | Unique(scope, key); nessuna risposta con segreti |
| `local_sessions` | id, token_hash, expires_at | Solo hash; esclusa da backup, rigenerata al riavvio |

Tabelle associative necessarie vanno create esplicitamente nelle migrazioni. Impostare foreign keys, indici su job/task/stato, sequence e hash. SQLite va usato su disco locale; WAL consente letture durante scritture ma non elimina la necessità di serializzare scritture e gestire `SQLITE_BUSY`. [SQLite WAL](https://www.sqlite.org/wal.html).

Vincoli aggiuntivi obbligatori: UNIQUE(job_id, chapter_id, revision), UNIQUE(job_id, visual_id, revision), totali/costi/prenotazioni non negativi (i delta del ledger possono avere segno), riferimenti di revisione coerenti con il progetto. `block_sources.block_revision_id` riferisce l'indice `block_revisions`; i blocchi sono modificati solo creando un nuovo AST di capitolo e il suo indice nella stessa transazione. `document_revisions` fissa esattamente le revisioni dei capitoli e delle figure: non deve risolvere “la versione più recente” durante un export. Tabelle di task di manutenzione/import/export possono avere job_id nullo; gli invii IA mantengono sempre budget_account_id.

### Vocabolari di stato

Separare le enum per entità; non riutilizzare lo stato di un job come verdetto scientifico.

| Entità | Stati serializzati |
|---|---|
| Job | Enum uppercase e transizioni definite in 05 |
| Task | BLOCKED, READY, RUNNING, SUCCEEDED, FAILED, CANCELLED |
| Estrazione di fonte | pending, extracted, needs_review, failed |
| Capitolo/documento | draft, needs_review, ready |
| Artifact | pending, ready, failed; il parziale resta pending con metadata partial |
| Export | pending, running, ready, failed |
| Revisione visuale | SPEC_DRAFT, COMPILED, LOCAL_CHECKED, REVIEWED, PATCHING, ACCEPTED, NEEDS_REVIEW, REJECTED |
| Report | passed, failed, needs_review, unverified |
| Chiamata provider | Enum uppercase e transizioni definite in 09 |
| Backup | IN_PROGRESS, VERIFIED, FAILED |

Un capitolo ready ha superato i propri controlli; il documento completo richiede anche quelli globali e visuali. Gli eventi chapter.partial sono aggiornamenti di bozza, non uno stato di completamento. I campi di copertura mentioned/developed/verified descrivono prove di un requisito e non sostituiscono questi vocabolari.

## 3. Richiesta di generazione

```json
{
  "schemaVersion": "1.0",
  "projectId": "uuid-project",
  "sourceSelectionRevisionId": "uuid-selection",
  "subjectProfileRevisionId": "uuid-profile",
  "mode": "summary",
  "scope": {
    "requestedTopics": ["Legge di Gauss", "distribuzioni sferiche"],
    "includePrerequisites": true,
    "sourcePolicy": "grounded_with_labeled_extensions"
  },
  "student": {
    "level": "university",
    "examFormat": "written_and_oral",
    "mathDetail": "explicit",
    "studyTimeMinutes": null
  },
  "output": {
    "language": "it",
    "selfContained": true,
    "visualQuality": "standard",
    "formats": ["pdf", "markdown"]
  },
  "economy": {"capEurMicro": 2000000, "policy": "economical_quality"},
  "customInstructions": "Indica quale punto della consegna stai svolgendo."
}
```

Gli ID nell'esempio sono segnaposto leggibili; le API reali richiedono UUID validi. L'utente sceglie la richiesta tramite UI; il server risolve le revisioni e verifica che tutti i riferimenti appartengano al progetto. Il client non può dichiarare una fonte già verificata o un costo già pagato.

## 4. Unità di fonte e provenienza

```json
{
  "schemaVersion": "1.0",
  "sourceUnitId": "uuid-source-unit",
  "documentId": "uuid-document",
  "pageIndex": 14,
  "printedPageLabel": "13",
  "kind": "formula",
  "bbox": [0.1, 0.25, 0.8, 0.12],
  "representation": {"latex": "E(r)=k r^2/(4\\varepsilon_0)"},
  "extraction": {"method": "vision", "status": "needs_review", "confidence": 0.82},
  "uncertainties": [{"field": "representation.latex", "reason": "Il simbolo k è poco leggibile"}]
}
```

`confidence` del modello è un indizio, non una probabilità calibrata. Le classi di provenienza sono `source_exact`, `source_extracted`, `source_reconstructed`, `digitized_approximate`, `formula_derived`, `synthetic_example`, `external_verified`, `unknown`. Non promuovere automaticamente un dato OCR a `source_exact`.

## 5. AST del documento

`DocumentRevision` contiene titolo, capitoli ordinati, registro simboli, riferimenti e revisioni delle figure. Ogni capitolo contiene blocchi tipizzati: heading, paragraph, list, equation, derivation, table, exercise, callout, figureRef, citation, code. Il Markdown è un formato di ingresso/uscita dell'editor, non l'unica verità interna.

Campi obbligatori di un blocco: `blockId`, `type`, `revision`, `sourceRefs`, `conceptRefs`, `content`. Un `derivation` contiene passaggi `{from, operation, justification, to, assumptions}`; un esercizio contiene `originalStatement`, `questionParts`, `solutionsByPart`, risultati e controlli. Un `figureRef` contiene `visualId`, `visualRevisionId`, `placement`, `caption`, `altText`; mai un URL deciso dal modello.

Il piano conserva per ogni requisito `requirementId`, origine, priorità, capitolo assegnato e risultato atteso. La copertura usa quattro campi diversi: `mentioned`, `developed`, `verified`, `excludedWithReason`. Per ciascuno registra evidenze, non soltanto un booleano. Nessuna lista vuota può produrre automaticamente “copertura 100%” se la fonte non è stata ancora inventariata.

## 6. Report di verifica

```json
{
  "schemaVersion": "1.0",
  "targetRevisionId": "uuid-revision",
  "targetHash": "sha256-hex",
  "checkType": "scientific",
  "status": "needs_review",
  "findings": [{
    "id": "finding-1",
    "severity": "critical",
    "code": "UNSUPPORTED_NUMERIC_VALUE",
    "targetId": "block-12",
    "evidenceRefs": ["source-unit-3"],
    "explanation": "Il valore numerico non compare nella fonte e non è derivato.",
    "suggestedAction": "Ricontrollare il dato nella pagina originale."
  }]
}
```

Stati ammessi: `passed`, `failed`, `needs_review`, `unverified`. Campi mancanti o JSON non conforme producono `unverified`, mai `passed`. Il sistema calcola il verdetto applicativo dai findings e dai controlli locali; non accetta un booleano del modello in contrasto con un finding critico.

## 7. Atomicità tra database e file

Scrivere un artifact in un file temporaneo sullo stesso filesystem; chiuderlo, verificarne hash e formato; rinominarlo nella posizione definitiva; in una transazione inserire riferimento, avanzamento del task ed evento. Se il processo muore dopo il rename ma prima della transazione, resta un blob orfano riutilizzabile o eliminabile; non un record che indica un file completo inesistente. Gli artifact incompleti non hanno stato `ready`.

La promozione di una revisione di capitolo, dei suoi rapporti e dei relativi riferimenti deve essere atomica. In caso di due tab in modifica, il secondo salvataggio con revisione vecchia restituisce `409 REVISION_CONFLICT`, mostrando entrambe le versioni.

## 8. Accettazione

Validare tutti gli esempi con gli schemi realizzati, più esempi negativi. Dimostrare rollback, duplicate request, crash tra file e transazione, riferimenti orfani e migrazione da database vuoto. Una revisione cambiata deve rendere obsoleti i report precedenti. Il contratto dei provider viene testato contro risposte registrate e sintetiche, senza dipendere da un servizio attivo.
