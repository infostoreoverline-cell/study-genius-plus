# O — Roadmap esecutiva per Google Antigravity

Scopo: ricostruire l'intera applicazione in una nuova repository, senza dipendere dal vecchio stato di sviluppo. Ogni milestone è un blocco autonomo di lavoro; la versione completa richiede M00–M15.

## 1. Regole di esecuzione

Leggere 00, 03, 04 e 15 prima di scrivere codice. Usare il vecchio snapshot soltanto come riferimento e insieme di regressioni. Tenere docs/implementation con questo pacchetto, docs/adr con decisioni e docs/progress con prove.

Prima di ciascun blocco identificare i contratti coinvolti; dopo ogni modifica a uno schema aggiornare tipi, migrazione, adapter, UI e test pertinenti. Non creare un secondo percorso temporaneo che poi diventi quello reale.

Non occorre chiedere a Marco di approvare ogni scelta reversibile. Risolvere le normali scelte tecniche con una prova mirata. Chiedere una decisione solo se cambia il prodotto richiesto, servono credenziali non disponibili, occorre aumentare una spesa autorizzata o c'è un blocco che non si può risolvere nel perimetro. Preparare prima un risultato concreto e una spiegazione della scelta.

I comandi sotto sono il contratto operativo da creare nella nuova repository; non si presume che esistano già nel progetto vecchio.

## 2. Dipendenze e risultati

| Blocco | Dipende da | Documento guida | Risultato osservabile |
|---|---|---|---|
| M00 — Prove tecniche | — | 03, 08, 11, 14 | Stack e rischi verificati, versioni fissate |
| M01 — Contratti e archivio | M00 | 04 | Database vuoto, migrazioni, revisioni e blob |
| M02 — App locale e UI base | M01 | 03, 06, 14 | Avvio locale, sessione, archivio e impostazioni |
| M03 — Lavori persistenti | M01–M02 | 05 | Coda, eventi, pausa, ripresa e crash recovery |
| M04 — Budget | M01, M03 | 09 | Ledger e ammissione atomica delle chiamate |
| M05 — Chiavi e provider | M02–M04 | 06, 08 | Google/DeepSeek tramite gateway comune |
| M06 — Fonti | M03–M05 | 07 | Importazione, evidenze, OCR e provenienza |
| M07 — Appunti e metodo | M05–M06 | 10 | Piano e capitoli verificabili, quattro modalità |
| M08 — SVG di base | M01, M06–M07 | 11 | Mappe, funzioni, dati e registry |
| M09 — Figure complete | M08 | 11 | Chimica, fisica, flussi, composizioni e import legacy |
| M10 — Revisione SVG | M04–M05, M08–M09 | 12 | Ciclo limitato e gate reali |
| M11 — Documento ed editor | M07–M10 | 06, 13 | Assemblaggio e revisioni coerenti |
| M12 — Esportazioni | M11 | 13 | PDF/Markdown/LaTeX, QA e download offline |
| M13 — Operatività locale | M03, M05, M12 | 14 | Installazione, backup, restore e manutenzione |
| M14 — Qualità e prezzi misurati | M05–M13 | 08–10, 15 | Policy modelli basata su campioni reali |
| M15 — Rilascio completo | Tutti | 15 | Percorso finale su PC pulito e guida utente |

## 3. M00 — Ridurre subito i rischi tecnici

Creare workspace TypeScript, configurazione strict, lockfile, comandi base e manifest di versione. Escludere dati runtime, segreti e dipendenze generate dal repository.

Eseguire piccoli spike verificabili:

- Node 24 LTS e better-sqlite3 sul target Windows, transazione e backup.
- Chromium locale: SVG con testo/formula, MathJax locale, PDF senza rete.
- SecretStore DPAPI: scrittura/lettura di una chiave fittizia dopo riavvio.
- Parser PDF/PPTX/DOCX su una fixture ciascuno.
- Renderer chimico candidato su cariche, geometrie e meccanismi necessari.
- SDK Google/DeepSeek: verifica dei metodi e trasformazione di payload/usage tramite fixture, senza chiamate vere prima del ledger.

Produrre ADR per stack, renderer chimico, conversione slide, motore di paginazione e secret helper. Risolvere qui le incompatibilità native o di API; non rimandarle al momento del download finale.

**Gate:** npm ci, typecheck e smoke test eseguibili; binari/versioni annotati; nessuna chiave reale necessaria. Gli spike possono essere sostituiti, ma i test che verificano i contratti vanno mantenuti.

## 4. M01 — Dati e contratti

Implementare gli schemi 04 con esempi positivi/negativi; generare tipi. Creare migrazioni, repository dati, blob store, revisioni, artifact e dipendenze. Aggiungere versionamento ottimistico e integrità dei riferimenti.

Output: packages/contracts, packages/storage, nuclei domain, tests/integration/storage. Implementare diagnostica delle migrazioni e un database di prova da zero.

**Gate:** rollback su errore, duplicato idempotente, revisione concorrente 409, crash fra file e commit, invalidazione transitiva. Nessun endpoint può accettare un ID appartenente a un altro progetto.

## 5. M02 — Avvio e schermate

Implementare launcher, lock dell'istanza, health, sessione locale, controllo Host/Origin, asset compilati e UI italiana. Creare Archivio, Nuovo lavoro, Workspace, Figure e Impostazioni con dati persistenti reali, anche se la generazione usa ancora il provider simulato.

Mostrare chiaramente quando è attiva una demo. Implementare navigazione, accessibilità e gestione errori centralizzata.

**Gate:** doppio avvio riusa l'istanza; nessuna esposizione su rete esterna; una pagina di altra origine non modifica dati; chiudere il tab non spegne il processo. La UI non contiene controlli che sembrano operativi ma non hanno implementazione.

## 6. M03 — Coda e ripresa

Implementare task, dipendenze, lease, checkpoint, heartbeat, SSE con sequence/replay e stati canonici. Scrivere un provider simulato con ritardi, errori e risposte parziali.

La demo deve attraversare tutte le fasi del job, senza saltare direttamente a COMPLETED. La cancellazione e la pausa sono comandi persistenti.

**Gate:** crash a metà lavoro, riapertura browser, riconnessione SSE, pause/resume, annullamento con task attivo. Nessun doppio artifact o stato globale condiviso fra lavori.

## 7. M04 — Denaro prima delle API vere

Implementare prezzi versionati, cambi, micro-EUR, prenotazioni, ledger e stati di chiamata. Aggiungere UI per tetto, regolato, impegnato, incerto e residuo. Implementare prezzo scaduto e gestione delle finestre orarie.

Output: packages/budget e interfaccia obbligatoria usata dal gateway. Le prove usano importi fittizi esatti.

**Gate:** due task sullo stesso residuo, timeout ambiguo, retry, cancel, crash e replay. Una ricerca nel codice e regole di importazione dimostrano che non esiste un client provider attivabile senza questa ammissione.

## 8. M05 — Credenziali e gateway

Implementare salvataggio sicuro di entrambe le chiavi dalla UI, versioni credenziali, invalidazione client, catalogo modelli e gruppi quota. Creare adapter Google e DeepSeek sul contratto comune.

I test automatici usano fixture. Il piccolo test reale viene attivato dalla UI con limite di spesa già implementato; se Marco non ha ancora inserito le chiavi, registrare questo come unica verifica rinviata, senza fingere l'integrazione reale.

**Gate:** dopo riavvio le chiavi funzionano senza .env; sostituirle cambia il client successivo; richieste/risposte/costi indicano il modello effettivo; output invalido e usage mancante non diventano successo.

## 9. M06 — Materiali ed evidenze

Implementare stream upload, import locale controllato, deduplicazione, parser, unità di fonte, OCR selettivo e indice. Aggiungere pannello fonte/pagina, correzione di evidenza e riepilogo anomalie.

Il dossier del task è persistente e ricostruibile. Ogni chiamata OCR passa dal gateway e dal conto del lavoro.

**Gate:** fixture F01–F04; scansioni isolate, slide reali, formula incerta e file interrotto. Reimportazione senza duplicare costi di estrazione compatibili.

## 10. M07 — Generazione didattica

Implementare profili materia e personalizzazione, quattro modalità, focus assistito, compilatore prompt, piano/coverage, generazione capitoli, validazione e repair limitato. Definire registro simboli e mapping di esercizi/sottopunti.

Integrare la continuazione con fonti originali e requisiti mancanti. Evitare concatenazione cieca di testi.

**Gate:** Riassunto e Completo coprono lo stesso ambito con profondità diversa; Teoria ed Esercizi soddisfano i loro contratti. F05–F06 distinguono le densità. La fixture “solo Gauss” fallisce copertura sviluppata. Un repair cambia hash e invalidazioni.

## 11. M08 — Registry e SVG quantitativi

Implementare VisualIntent/VisualSpec, registry esaustivo, compilatore, artifact manager, sanitizer, valutatore matematico e renderer concept_map/function_plot/xy_plot. Includere font locali, coordinate semantiche e geometria.

Collegare figure ai capitoli e all'inventario. Una figura fallita rimane visibile come problema.

**Gate:** F07–F08 e F10; nessun eval/new Function di input; gap corretti; dataset fedele; mappa con ciclo; ID univoci tra più figure nello stesso documento.

## 12. M09 — Completare la copertura visuale

Implementare tutti i sottotipi chimici elencati in 11, diagrammi fisici, flussi, figure composite e source_image. Integrare il renderer scelto in M00.

Creare importatori legacy puramente dichiarativi per vecchi blocchi strutturati, con diagnostica delle ambiguità. Non incorporare un secondo diagram engine.

**Gate:** fixture per ogni kind e sottotipo; direzioni, cariche, conteggi e legami controllati. Ogni opzione richiesta è raggiungibile dal normale generatore, non soltanto da un test isolato.

## 13. M10 — Migliorare e approvare le figure

Implementare manifest geometrico, raster alla scala finale, revisore multimodale, findings strutturati, patch ammesse, rollback, anti-oscillazione e limiti economici. Report sempre legati alla revisione.

Collegare UI Figure con fonte, prima/dopo e motivi del fallimento. Implementare la distinzione tra bozza e figura accettata.

**Gate:** nessuna approvazione con finding critico o controllo saltato; cinque revisioni visuali riuscite massime per ciclo secondo 12, con limite globale di spesa; patch semantica invalida il rapporto scientifico. Il percorso end-to-end usa realmente il ciclo.

## 14. M11 — Assemblare e modificare

Implementare AST documentale, numerazione, riferimenti, registro simboli, editor, confronto e rigenerazione mirata. Aggiungere riepilogo copertura e qualità.

Ogni azione di repair mostra ambito e residuo. Ripristinare una versione mantiene costi e storia.

**Gate:** due tab con conflitto, modifica di formula che invalida la figura, titolo cambiato senza nuova generazione, continuazione senza duplicati, documento autonomo per gli amici.

## 15. M12 — Consegna dei documenti

Implementare renderer comune, print CSS, MathJax/font locali, PDF QA, pacchetto Markdown e LaTeX con tutti gli asset. Aggiungere download cached e bozza con questioni aperte.

Il pulsante normale non può saltare controlli né effettuare nuove chiamate IA nascoste.

**Gate:** F11 e F14, ispezione dei PDF, formula multilinea, tabella lunga, citazioni, figure presenti e riferimenti risolti. Aprire pacchetti offline in un'altra cartella. Compilare il pacchetto LaTeX nell'ambiente di test dichiarato.

## 16. M13 — Affidabilità sul PC

Completare installer/release locale, Avvia/Chiudi, aggiornamento, backup consistente, restore, cestino, pulizia e diagnostica. Implementare spostamento dati e riconciliazione economica dei restore vecchi.

L'importazione legacy dell'archivio resta facoltativa per Marco, ma il percorso offerto deve essere sicuro e dichiarare la mancata verifica degli appunti vecchi.

**Gate:** installazione pulita, backup durante job, restore in nuova directory, chiavi escluse, costi non dimenticati, interruzione migrazione e rollback recuperabile.

## 17. M14 — Misurare sui compiti veri

Eseguire il benchmark 15 con budget dichiarato. Confrontare modelli/costi su dossier identici, dare priorità alle materie scientifiche di Marco e scegliere policy per ruolo. Aggiornare tariffe e disponibilità con fonti ufficiali al momento del collaudo.

Ridurre contesto inutile e repair ripetitivi sulla base delle misure; non accorciare passaggi matematici per migliorare artificialmente il costo.

**Gate:** rapporto con campioni, errori, rubriche, variabilità, costo totale e configurazione raccomandata. Dichiarare se un certo ambito non rientra in 3 € con qualità sufficiente e come l'app lo gestisce.

## 18. M15 — Consegna completa

Su PC pulito seguire questo percorso senza aprire sorgenti:

1. Installare e avviare.
2. Inserire Google/DeepSeek in Impostazioni e verificarli entro budget.
3. Importare un PDF misto e alcune slide.
4. Scegliere materia/modalità, confermare ambito e tetto.
5. Generare appunti, verificare fonti e figure.
6. Chiudere il browser e riaprire; simulare un'interruzione controllata e riprendere.
7. Correggere un passaggio e una figura, verificando invalidazioni/costi.
8. Scaricare PDF, Markdown e LaTeX.
9. Disconnettere Internet e riaprire/esportare la revisione pronta.
10. Eseguire backup e restore di prova.

Consegnare codice, lockfile, migrazioni, launcher, guida utente breve, guida sviluppatore, catalogo/prezzi datati, fixture, rapporti di test e note dei limiti. Nessuna chiave nel pacchetto.

**Gate finale:** tutte le milestone obbligatorie chiuse con evidenze; nessun blocker sul percorso; lista esplicita di limitazioni realmente rimaste. Una schermata dimostrativa con risposte finte non è il prodotto completo.

## 19. Modello di avanzamento da usare dopo ogni blocco

```markdown
# Mxx — Titolo
Stato: in corso / completata / bloccata
Commit:
Contratti e ADR coinvolti:
Comportamento raggiungibile dalla UI:
File e moduli modificati:
Verifiche realmente eseguite:
Esiti e artifact dimostrativi:
Costo API delle prove, se presenti:
Limiti o problemi aperti:
Prossimo blocco e dipendenze soddisfatte:
```

Se una decisione tecnica cambia, aggiornare il documento interessato e la mappa 02; non lasciare un piano formalmente completo che descrive un altro software.

