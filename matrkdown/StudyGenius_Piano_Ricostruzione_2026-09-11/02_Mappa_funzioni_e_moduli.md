# A2 — Mappa delle funzioni e dei moduli

Questo documento consente di controllare che la ricostruzione copra il progetto esistente e le richieste aggiunte. Le destinazioni sono relative a packages/ o apps/ della struttura 03. “Preservare” significa mantenere una capacità utile; non copiare automaticamente la sua implementazione.

## 1. Corrispondenza delle capacità

| Capacità | Origine nel progetto | Nuova realizzazione | Accettazione |
|---|---|---|---|
| Sito e workspace | public/app.js, index.html, style.css | React, archivio/fonti/editor/figure/impostazioni | M02, M11 |
| File e slide | extractorService, extractRoutes | Ingestione per unità reali, OCR selettivo | M06 |
| Materie e prompt personali | subjects, prompts, configRoutes | Profili versionati modificabili dalla UI | M05, M07 |
| Sintesi/Completo/Focus | scopeService, descrizioni funzionali | Quattro modalità + focus assistito come selezione | M07 |
| Metodo fisico rigoroso | prompt, regole accademiche e lenti | Sottopunti, ipotesi, passaggi e controlli | M07, M14 |
| Grafo e piano | knowledgeGraph, planning | Copertura completa, requisiti e dossier | M07 |
| DeepSeek | aiService e chiamate nell'orchestratore | Adapter corrente dietro gateway | M05 |
| Google multimodale | multimodal e access manager | Adapter corrente, ruoli/capacità/quote | M05 |
| Chiavi configurabili e durature | Gestione Google parziale; richiesta nuova | Entrambi i provider via UI + SecretStore | M05, M13 |
| Costo massimo 2–3 € | Richiesta nuova, metriche precedenti parziali | Budget globale atomico con costi incerti | M04, M14 |
| SVG deterministici | diagramEngine, renderer, visual compiler | Registry unico, semantic model e layout | M08–M09 |
| Revisione SVG ripetuta | visualFeedbackLoop, geometry, patch | Ciclo limitato, rollback, evidenze e gate | M10 |
| Grafici chimici avanzati | chemistryRenderer e schemi | Sottotipi espliciti e fixture per ciascuno | M09 |
| Continuazione | generationRoutes e orchestratore | Ripresa basata su fonti/piano/blocchi mancanti | M03, M07 |
| Sessioni e salvataggi | sessionService | Progetti, revisioni, SQLite e blob | M01, M11 |
| Esportazione | pdfExportService, exportRoutes | PDF/Markdown/LaTeX da AST comune | M12 |
| Ripresa e backup robusti | Checkpoint/script precedenti, richiesta di affidabilità | Coda persistente, backup/restore verificati | M03, M13 |
| Avvio sul PC | File .bat | Launcher con istanza identificata e dati separati | M02, M13 |

## 2. Percorso operativo ricostruito

Lettura statica del percorso ordinario, non una traccia di esecuzione end-to-end:

1. server.js carica configurazione, route e frontend.
2. Il frontend richiede estrazione e invia testo/impostazioni per generare.
3. generationRoutes invoca orchestratorService, che coordina scope, grafo, piano, blocchi, IA, trasformazioni, audit e salvataggio.
4. diagramEngine interpreta più sintassi e richiama renderer diversi.
5. sessionService salva risultati; exportRoutes richiama pdfExportService su contenuto ricevuto.
6. Download, renderer sperimentali e script possono attivare percorsi differenti.

La distinzione principale della ricostruzione è che ogni funzione utile entra nello stesso flusso persistente. Moduli come il compiler canonico, l'assemblatore globale e alcuni revisori non vanno considerati già integrati solo perché esistono o hanno test. Gli import sono un indizio di collegamento, non dimostrano che un ramo venga eseguito.

## 3. Inventario completo di src

Sono elencati tutti i 73 file src acquisiti, per 25.200 righe complessive. Il conteggio include righe vuote/commenti e il catalogo JSON. I link sono fissati al commit dell'audit.

| File originale | Righe | Responsabilità | Destinazione nuova | Decisione |
|---|---:|---|---|---|
| [config/googleAIStudioOperationalCatalog.json](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/config/googleAIStudioOperationalCatalog.json) | 938 | Catalogo Google | providers/catalog + budget/prices | Versioni, validità e capacità; A17–A18 |
| [config/index.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/config/index.js) | 142 | Configurazione generale | domain/settings + bootstrap | Valori persistenti e limiti del PC; A14, A18 |
| [config/subjects.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/config/subjects.js) | 33 | Materie predefinite e personalizzate | pedagogy/profiles | Profili versionati, nessun export implicito |
| [core/contract.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/contract.js) | 235 | Invarianti del risultato | contracts + domain/gates | Gate centralizzati senza default favorevoli |
| [core/coverageMatrix.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/coverageMatrix.js) | 128 | Copertura dei concetti | pedagogy/coverage | Distinguere menzione/sviluppo/verifica; A09 |
| [core/graphValidator.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/graphValidator.js) | 220 | Validazione grafo concettuale | domain/knowledge | Relazioni semantiche e cicli espliciti |
| [core/jobState.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/jobState.js) | 221 | Stati del lavoro | domain/jobs + storage/tasks | Enum e transizioni validate; A11 |
| [core/knowledgeGraph.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/knowledgeGraph.js) | 800 | Concetti e relazioni | domain/knowledge | ID persistenti e tutta la fonte |
| [core/promptCompiler.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/promptCompiler.js) | 375 | Composizione prompt | pedagogy/promptCompiler | Versioni e dossier persistenti |
| [core/qualityEngine.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/qualityEngine.js) | 949 | Audit dei contenuti | pedagogy/review | Findings strutturati legati all'hash |
| [core/schemas.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/schemas.js) | 1006 | Schemi applicativi | contracts/schemas | Schema unico e strict; A01 |
| [core/textSanitizer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/textSanitizer.js) | 221 | Pulizia del testo | documents/import + security | Parser strutturale, originale conservato |
| [core/visualCoverage.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/visualCoverage.js) | 733 | Presenza delle figure richieste | pedagogy/visualCoverage | Inventario completo e artifact accettati |
| [core/visualLedger.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/visualLedger.js) | 316 | Registro delle figure | storage/visuals | Per job/revisione, senza reset distruttivo; A04 |
| [core/visualObserver.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/visualObserver.js) | 142 | Rilevazione di elementi visuali | ingestion/visualEvidence | Rilevazione distinta da approvazione |
| [core/visualReadingContract.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/core/visualReadingContract.js) | 340 | Requisiti di lettura visuale | contracts/visualIntent + ingestion | Collegamento a evidenze originali |
| [epistemology/chemistry.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/epistemology/chemistry.js) | 33 | Criteri chimici | pedagogy/lenses | Strutture, unità, cariche e conteggi |
| [epistemology/computerScience.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/epistemology/computerScience.js) | 28 | Criteri informatici | pedagogy/lenses | Invarianti e casi limite |
| [epistemology/humanities.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/epistemology/humanities.js) | 44 | Criteri per discipline umanistiche | pedagogy/lenses | Fonti, cronologia, interpretazioni |
| [epistemology/index.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/epistemology/index.js) | 61 | Selezione lente disciplinare | pedagogy/lenses/index | Registro esaustivo e profilo generico |
| [epistemology/math.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/epistemology/math.js) | 26 | Criteri matematici | pedagogy/lenses | Ipotesi, dimostrazioni e domini |
| [epistemology/physics.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/epistemology/physics.js) | 49 | Criteri fisici | pedagogy/lenses | Simmetrie, passaggi e controlli |
| [generation/blockManager.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/generation/blockManager.js) | 197 | Segmenti di generazione | domain/chapters + storage | Blocchi versionati con fonti |
| [generation/repairLoop.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/generation/repairLoop.js) | 413 | Riparazione del testo | pedagogy/repair | Limitata, mirata, nuova verifica; A21 |
| [generation/seamWelding2.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/generation/seamWelding2.js) | 110 | Raccordo fra frammenti | documents/assembler | Coerenza per ID, senza cancellare contenuti |
| [generation/shardRoles.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/generation/shardRoles.js) | 94 | Ruoli assegnati ai frammenti | pedagogy/chapterPlan | Unità didattiche complete; A20 |
| [multimodal/localAnalyzer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/multimodal/localAnalyzer.js) | 316 | Analisi locale prima dell'IA | ingestion/localAnalysis | OCR selettivo e controlli economici |
| [multimodal/multimodalRouter.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/multimodal/multimodalRouter.js) | 200 | Instradamento multimodale | providers/gateway | Prezzi e ruoli reali; A18 |
| [multimodal/semanticFusionEngine.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/multimodal/semanticFusionEngine.js) | 241 | Fusione testo e immagine | ingestion/evidenceFusion | Conflitti e incertezze visibili |
| [multimodal/visualCacheService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/multimodal/visualCacheService.js) | 113 | Cache multimodale | storage/cache | Chiave per fonte/versioni/modello |
| [multimodal/visualEvidenceService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/multimodal/visualEvidenceService.js) | 1246 | Raccolta evidenze visuali | ingestion/visualEvidence | Fonte/crop/hash persistenti |
| [planning/batchPlanner.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/planning/batchPlanner.js) | 477 | Gruppi di generazione | worker/planner | Concorrenza globale limitata |
| [planning/blueprint.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/planning/blueprint.js) | 336 | Struttura del documento | domain/plan | Piano immutabile e dipendenze |
| [planning/pedagogicalCompiler.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/planning/pedagogicalCompiler.js) | 324 | Piano didattico | pedagogy/planner | Requisiti verificabili |
| [planning/preflightPlanner.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/planning/preflightPlanner.js) | 135 | Analisi preliminare | pedagogy/preflight + budget | Ambito e fattibilità economica |
| [prompts/visualCriticPrompts.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/prompts/visualCriticPrompts.js) | 147 | Prompt dei revisori visuali | visuals/reviewPrompts | Schema unico, fonte e immagine |
| [rendering/chapterArtifactManager.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/chapterArtifactManager.js) | 119 | Artifact dei capitoli | storage/artifacts | Cache versionata e usata dal worker |
| [rendering/chemistryRenderer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/chemistryRenderer.js) | 700 | Diagrammi chimici | visuals/renderers/chemistry | Sottotipi espliciti, nessun fallback falso |
| [rendering/conceptMapRenderer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/conceptMapRenderer.js) | 629 | Mappe concettuali | visuals/renderers/conceptMap | Cicli e rimandi, unico renderer |
| [rendering/diagramEngine.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/diagramEngine.js) | 824 | Parsing di più formati visuali | visuals/compiler + legacyImporter | Eliminare percorsi duplicati; A08, A19 |
| [rendering/globalAssembler.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/globalAssembler.js) | 120 | Assemblaggio globale | documents/assembler | Collegare al flusso ordinario |
| [rendering/pdfQA.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/pdfQA.js) | 281 | Controllo PDF | documents/pdfQa | Tutte le pagine e aree a rischio |
| [rendering/semanticReferenceResolver.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/semanticReferenceResolver.js) | 117 | Riferimenti semantici | documents/references | Integrato nell'assemblaggio reale |
| [rendering/svgGeometryAnalyzer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/svgGeometryAnalyzer.js) | 365 | Misure e collisioni | visuals/geometry | Font caricati, overlap intenzionali distinti |
| [rendering/svgPatchEngine.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/svgPatchEngine.js) | 407 | Patch visuali | visuals/patches | Operazioni ammesse, precondizioni e rollback |
| [rendering/svgSanitizer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/svgSanitizer.js) | 351 | Sanitizzazione SVG | visuals/sanitize | Obbligatoria per ogni percorso |
| [rendering/visualArtifactManager.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/visualArtifactManager.js) | 260 | Artifact delle figure | storage/artifacts | Revisioni, hash e dipendenze |
| [rendering/visualFeedbackLoop.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/visualFeedbackLoop.js) | 560 | Revisione iterativa SVG | visuals/reviewWorkflow | Fail closed, limiti e budget; A05–A06 |
| [rendering/visualGroundTruth.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/visualGroundTruth.js) | 324 | Riferimento di verità visuale | visuals/evidence | Da fonte e dati, non dallo stesso SVG |
| [rendering/xyPlotRenderer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/rendering/xyPlotRenderer.js) | 411 | Grafici XY | visuals/renderers/xyPlot | Dataset e unità conservati |
| [routes/configRoutes.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/configRoutes.js) | 200 | Preferenze, prompt e credenziali | server/http/settings | Schema e SecretStore; A02, A16 |
| [routes/exportRoutes.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/exportRoutes.js) | 46 | Download e generazione PDF | server/http/exports | Gate su revisione, zero IA nascosta; A07 |
| [routes/extractRoutes.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/extractRoutes.js) | 399 | Upload ed estrazione | server/http/documents | Streaming, unità reali e task |
| [routes/generationRoutes.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/generationRoutes.js) | 103 | Avvio e continuazione | server/http/jobs | Coda persistente e budget comune |
| [routes/index.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/index.js) | 17 | Composizione route | server/http/index | Versionamento API e guard comuni |
| [routes/sessionRoutes.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/routes/sessionRoutes.js) | 76 | Archivio e modifica sessioni | server/http/projects | Revisioni/ID opachi; A24 |
| [services/aiService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/aiService.js) | 1078 | Chiamate Google/DeepSeek | providers/gateway + adapters | Ogni invio passa dal budget; A15 |
| [services/extractorService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/extractorService.js) | 318 | PDF e slide | ingestion | Provenienza reale, limiti e cache; A14, A22 |
| [services/googleAIStudioAccessManager.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/googleAIStudioAccessManager.js) | 1326 | Credenziali, modelli e permessi | providers/catalog + quota + security | Nessuno stato globale delle chiavi; A16–A17 |
| [services/orchestratorService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/orchestratorService.js) | 831 | Regia di piano e generazione | domain/workflow + worker | Scomporre stato e dipendenze; A03–A04, A11–A12, A20–A21 |
| [services/pdfExportService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/pdfExportService.js) | 1198 | HTML e PDF | documents/export | Renderer comune e artifact verificati |
| [services/promptService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/promptService.js) | 67 | Lettura/salvataggio prompt | pedagogy/prompts + storage | Contratto unico; A02 |
| [services/scopeService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/scopeService.js) | 143 | Selezione argomenti | pedagogy/scope | Piano con esclusioni visibili |
| [services/sessionService.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/services/sessionService.js) | 142 | Sessioni su filesystem | storage/repositories | SQLite, blob e migrazioni; A24 |
| [verification/critics.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/verification/critics.js) | 94 | Revisori accademici | pedagogy/review | Contratto input/output corretto; A10 |
| [verification/visualQualityGates.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/verification/visualQualityGates.js) | 390 | Soglie visuali | visuals/gates | Finding critico blocca sempre |
| [visual/visualArchitect.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/visual/visualArchitect.js) | 346 | Proposta semantica delle figure | pedagogy/visualPlanner | VisualIntent/Spec entro schema |
| [visual/visualSpecCompiler.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/visual/visualSpecCompiler.js) | 348 | Compiler visuale canonico | visuals/compiler | Passaggio obbligatorio anche in produzione; A19 |
| [visualization/dataBuilder.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/visualization/dataBuilder.js) | 205 | Costruzione dati/serie | visuals/datasets | Calcolo limitato e provenienza |
| [visualization/graphRenderer.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/visualization/graphRenderer.js) | 528 | Grafici quantitativi alternativi | visuals/renderers | Convergere sul registry unico |
| [visualization/graphSpec.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/visualization/graphSpec.js) | 162 | Specifica quantitativa | contracts/visualSpec | Migrazione al tipo canonico |
| [visualization/graphValidator.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/visualization/graphValidator.js) | 293 | Validazione GraphSpec | contracts/visualSpec + visuals/validate | Un solo contratto, nessuna divergenza |
| [visualization/index.js](https://github.com/infostoreoverline-cell/study_genius/blob/f27ee7e2bff9ea6327be9891905e23500a0f1e91/StudyGenius/src/visualization/index.js) | 33 | Facade dei grafici | visuals/index | Una sola interfaccia pubblica |

## 4. Frontend, prompt, specifiche e strumenti

Il frontend comprende app.js, index.html, style.css e conceptMapRendererClient.js. Quest'ultimo non deve diventare una seconda interpretazione della figura: il nuovo client visualizza artifact o usa lo stesso package deterministico del backend.

Il gruppo prompts comprende i sette profili Fisica, Matematica, Chimica, Informatica, Storia, Diritto ed Economia, generic.md, base_skill.md, modus_operandi_fisica.md e user_preferences.json. Trasferire i contenuti utili in template/profili versionati; le preferenze personali restano nel database, senza includere segreti.

Le specifiche in “descrizioni funzionamento” coprono materie, sintesi accademica, modalità completa, focus/focus assistito, scope, istruzioni e sessioni. I due master didattico/visuale e i documenti di metodo in “markdown esempio” chiariscono le intenzioni; il piano 10 le trasforma in contratti e prove. Il contenuto di una specifica non dimostra che il comportamento fosse già presente nel codice.

Le regole accademiche e il metodo fisico presenti nella documentazione della repository vengono preservati come requisiti del prodotto: completezza rispetto al piano, niente salti nei passaggi necessari, indicazione del sottopunto, verità prima dell'estetica. Le istruzioni locali degli agenti della vecchia repository non diventano automaticamente istruzioni operative della nuova.

I 19 file nella cartella scripts sono utility di generazione esempi, anteprime, test di corso, ottimizzazione figure e recupero sessioni. Trasferire solo gli strumenti ancora necessari, facendoli usare i package dell'app. Non lasciare che uno script di esempio sia l'unico posto in cui una funzione opera.

I 29 file di test/test support acquisiti comprendono 26 file test_*.js, runner e benchmark. Le loro fixture sono utili per regressioni; gli esiti vanno rieseguiti, senza ereditare dichiarazioni di successo dai nomi dei file.

Gli esempi Markdown/SVG dimostrano tipi di output desiderati; non costituiscono un test generalizzato di correttezza. PDF e output binari sono stati inventariati ma non integralmente ispezionati in questo audit.

## 5. Cosa non trasferire automaticamente

- node_modules versionati: ricostruire da manifest e lockfile.
- Dati di sessioni e checkpoint come stato operativo nuovo: importare soltanto su richiesta, come legacy.
- Segreti e configurazioni dell'ambiente vecchio: reinserimento dalla nuova UI.
- Singleton mutabili di ledger, job, cache e client che confondono lavori.
- Parser visuali duplicati, raw SVG non validato e invii IA fuori gateway.
- Successi fittizi dei fallback, tariffe costanti senza modello/data, reset del registro.
- Vecchi output generati come prova che una fonte è corretta o uno studente conosce l'argomento.

## 6. Controllo contro omissioni

Prima di M15 assegnare a ogni riga della tabella funzionale uno stato: implementata e verificata; implementata ma verifica bloccata; non implementata con motivazione. Le capacità obbligatorie non possono finire nell'ultima categoria per chiudere la release.

Se una soluzione nuova sostituisce più moduli vecchi, la prova deve coprire tutte le loro capacità utili. Se una funzione viene eliminata perché insicura, conservare il risultato utile attraverso il nuovo contratto: per esempio un diagramma fisico dichiarativo al posto dell'esecuzione di codice TikZ arbitrario.

