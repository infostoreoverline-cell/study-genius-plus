# Study Genius+ — piano completo di ricostruzione

Versione del piano: 1.0 • 11 settembre 2026 • Destinatari: Marco Pin e Google Antigravity.

## Risultato da costruire

Un'applicazione personale sul PC che trasformi materiali universitari in appunti affidabili, completi rispetto all'ambito scelto e realmente studiabili. L'interfaccia si apre nel browser; archivio e impostazioni sono conservati sul PC. Per le elaborazioni IA, i materiali necessari vengono inviati a Google o DeepSeek via Internet; le chiavi vengono salvate localmente e usate dal backend per autenticare queste richieste. Gli appunti destinati agli amici devono essere autonomi e distribuibili come PDF o pacchetto Markdown con figure.

Il budget iniziale è 2 € per lavoro, con massimo operativo configurabile a 3 €. Il limite comprende estrazione a pagamento, pianificazione, scrittura, revisioni, correzioni visuali e continuazioni dello stesso lavoro. Qualità e completezza sono misurate separatamente dal costo. Se un materiale non è elaborabile bene entro il tetto, il sistema conserva il lavoro e propone una riduzione esplicita dell'ambito; non elimina contenuti di nascosto.

## Giudizio sul progetto esistente

L'idea di separare comprensione della fonte, progetto didattico, generazione e rendering deterministico delle figure è valida. La realizzazione attuale presenta però percorsi duplicati, controlli che possono essere saltati, dati di fonte insufficienti per riprendere un lavoro e difetti riprodotti nei controlli. Nello snapshot esaminato esiste anche un errore di sintassi bloccante. La ricostruzione deve preservare il metodo didattico e trasformarlo in un flusso unico, verificabile.

Le evidenze sono in [01_Audit_repository.md](01_Audit_repository.md). L'inventario e la corrispondenza con il progetto nuovo sono in [02_Mappa_funzioni_e_moduli.md](02_Mappa_funzioni_e_moduli.md).

## Come usare questo pacchetto in Antigravity

1. Creare una cartella e una repository nuove. Copiare qui questi documenti, per esempio in `docs/implementation/`. Il vecchio progetto resta una fonte di confronto in lettura.
2. Leggere questo indice, il documento 03 sull'architettura, il 04 sui contratti, il 15 sui test e il 16 sull'ordine di implementazione.
3. Seguire una milestone del documento 16 alla volta. Caricare poi i documenti specialistici indicati dalla milestone.
4. Prima del codice, identificare input, output, invarianti, errori e prova di accettazione del blocco. Se un'API esterna è cambiata, aggiornare il relativo adapter e la decisione tecnica, senza alterare il contratto applicativo.
5. Dopo il blocco, produrre un resoconto con comportamento ottenuto, file modificati, verifiche eseguite e limiti ancora aperti. Salvare decisioni e avanzamento nella nuova repository.
6. La milestone iniziale non è il progetto finito. La consegna completa richiede tutte le milestone obbligatorie e le verifiche finali.

### Istruzione iniziale pronta per Antigravity

> Ricostruisci Study Genius+ da una cartella vuota seguendo questo pacchetto. Parti da 00, 03, 04, 15 e 16. Realizza le milestone nell'ordine delle dipendenze, in blocchi piccoli e verificabili. Mantieni un'app personale locale per Windows, fonti e stato persistenti, chiavi gestibili dall'interfaccia, budget condiviso da tutte le chiamate e un'unica pipeline per figure ed esportazione. Applica i contratti qui definiti e motiva eventuali variazioni in un ADR. Una funzione è completata solo quando è raggiungibile dal flusso utente e supera il criterio di accettazione, compresi i casi negativi. Non presentare come eseguiti i test soltanto descritti. Prosegui fino alla consegna completa, rendendo visibili eventuali blocchi reali.

## Indice dei blocchi

| File | Contenuto | Quando serve |
|---|---|---|
| [01](01_Audit_repository.md) | Evidenze, difetti e limiti dell'analisi | Prima delle scelte tecniche |
| [02](02_Mappa_funzioni_e_moduli.md) | Funzioni da mantenere, moduli esistenti, destinazioni | Per controllare la copertura |
| [03](03_Architettura_locale.md) | Stack, processi, cartelle, avvio locale | Fondamenta |
| [04](04_Contratti_e_database.md) | Entità, schemi, revisioni e database | Prima degli endpoint |
| [05](05_API_job_e_ripresa.md) | API, eventi, coda, pausa e ripresa | Backend operativo |
| [06](06_Interfaccia_e_chiavi_API.md) | Schermate e conservazione sicura delle chiavi | Esperienza d'uso |
| [07](07_Ingestione_e_fonti.md) | PDF, slide, immagini, OCR, provenienza | Materiali in ingresso |
| [08](08_Provider_Google_DeepSeek.md) | Modelli, adapter, capacità e limiti | Collegamenti IA |
| [09](09_Budget_e_costi.md) | Prezzi, prenotazioni, tetto e risparmio | Prima di chiamate reali |
| [10](10_Metodo_didattico_e_generazione.md) | Modalità, prompt, qualità, riparazioni | Appunti studiabili |
| [11](11_SVG_specifiche_e_rendering.md) | Contratti visuali, grafici, mappe e chimica | Figure esatte |
| [12](12_SVG_verifica_iterativa.md) | Controlli geometrici e revisione multimodale | Figure leggibili |
| [13](13_Documenti_ed_esportazione.md) | Anteprima, PDF, Markdown, LaTeX | Consegna degli appunti |
| [14](14_Sicurezza_backup_e_installazione.md) | Protezione locale, backup, manutenzione | Affidabilità quotidiana |
| [15](15_Test_errori_e_accettazione.md) | Fixture, guasti, soglie e prove finali | Ogni milestone |
| [16](16_Roadmap_Antigravity.md) | Blocchi di lavoro e dipendenze | Guida all'esecuzione |
| [17](17_Fonti_e_verifiche.md) | Fonti esterne e prove riproducibili dell'audit | Verifica delle affermazioni |

## Regole comuni e definizione di completamento

- Gli schemi del documento 04 governano le interfacce; 09 governa ogni addebito; 12 governa l'accettazione visuale; 15 governa il rilascio.
- Nei report, `passed`, `failed`, `needs_review` e `unverified` sono stati diversi. Nessun punteggio estetico può compensare un errore scientifico bloccante.
- Ogni formula, dato o figura conserva la provenienza. I dati inventati a scopo didattico sono identificati come esempi.
- Un riassunto è completo rispetto a un insieme esplicito di argomenti e fonti; il solo conteggio di pagine o parole non basta.
- Il cambio di una fonte, una formula o un blocco invalida soltanto gli elementi dipendenti, mantenendo gli altri risultati.
- La chiusura del browser non perde il lavoro. L'esportazione di una revisione già pronta non effettua nuove chiamate IA.
- I risultati sperimentali richiesti dal piano sono criteri da verificare durante la realizzazione. Non sono funzionalità già implementate da questo pacchetto.

## Confini della versione completa

Lo ZIP contiene 18 Markdown e la cartella `prove/` con manifest, risultati osservati e runner dell'audit. Estrarlo prima dell'uso mantiene validi i collegamenti relativi. Le prove sono spiegate nel documento 17; non richiedono chiavi API.

La prima versione completa include tutte le capacità funzionali descritte qui: materie personalizzabili, quattro modalità didattiche, focus assistito, fonti multiformato, Google e DeepSeek, budget, SVG, revisioni, PDF/Markdown/LaTeX, archivio, backup e avvio locale. Audio/video in ingresso, sincronizzazione cloud, collaborazione multiutente e modelli eseguiti sulla GPU del PC sono estensioni; i contratti permettono di aggiungerle senza renderle necessarie al funzionamento iniziale.

Non viene promesso un software privo di ogni possibile errore. Vengono definite le responsabilità, le condizioni di arresto e le prove che rendono gli errori rilevabili e recuperabili.
