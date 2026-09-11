# H — Budget, prezzi e controllo degli addebiti

Dipendenze: 04, 05, 08. Obiettivo dell'utente: spendere poco, con riassunti di qualità; tetto operativo per lavoro normalmente 2 €, elevabile fino a 3 €.

## 1. Che cosa comprende un lavoro

Un budgetAccountId accompagna il progetto di un riassunto: OCR remoto, piano, scrittura, verifiche, figure, riparazioni, retry, fallback e continuazioni. La revisione di un capitolo o una ripresa non crea automaticamente un nuovo portafoglio da 3 €. Per un riassunto diverso l'utente può creare un nuovo lavoro, con prezzo e ambito nuovamente visibili.

Il tetto è sull'uso API stimato e contabilizzato dall'app in EUR. Il provider emette la fattura effettiva: prezzi, tasse, arrotondamenti e chiamate dall'esito sconosciuto richiedono margini e riconciliazione. Non promettere un limite di fattura matematicamente garantito se il provider non offre un limite server corrispondente. Progettare prenotazioni conservative e blocco preventivo per rispettare il tetto nelle condizioni misurabili; mostrare sempre il costo incerto.

## 2. Prezzi documentali del giorno

Verifica: 11 settembre 2026. Costi per un milione di token, servizio Standard; non sono stime del prezzo di un intero riassunto.

| Provider / modello | Valuta | Input senza cache | Output | Validità rilevante |
|---|---|---:|---:|---|
| Gemini 3.5 Flash-Lite | USD | 0,30 | 2,50 | Listino consultato |
| Gemini 3.8 Flash | USD | 0,75 | 3,75 | Fino al 31 dicembre 2026 |
| Gemini 3.8 Flash | USD | 1,50 | 7,50 | Dal 1° gennaio 2027 |
| DeepSeek Flash, fascia piena | CNY | 2,00 | 8,00 | Fascia indicata sotto |
| DeepSeek Flash, fascia ridotta | CNY | 1,00 | 4,00 | Altri orari |

Per Google 3.8 il listino include i token di thinking nell'output fatturato. Non sommarli di nuovo se usage già li include. Per DeepSeek il listino consultato è in CNY: non leggere questi numeri come dollari. La fascia piena indicata è lunedì–venerdì, 09:00–12:00 e 14:00–18:00, timezone Asia/Shanghai. Verificare condizioni e valuta effettive dell'account prima di attivare le tariffe. [Prezzi Google](https://ai.google.dev/gemini-api/docs/pricing), [Prezzi DeepSeek](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/).

Il catalogo conserva anche cache, immagini, eventuale storage e modalità aggiuntive. Il preventivo di sicurezza assume input senza cache. Batch, Flex, caching remoto e ricerca web restano disattivati finché non hanno formula tariffaria, scadenza e test: il risparmio non giustifica addebiti non tracciati.

La data di validità è operativa. Una tariffa scaduta mette in attesa le nuove chiamate che la richiedono. Una configurazione impostata a zero significa “gratuità verificata per questo caso”, non “prezzo sconosciuto”. Le quote gratuite non sono un diritto permanente.

## 3. Snapshot di prezzo

Ogni snapshot contiene:

- provider, modello richiesto, modalità, valuta di fatturazione;
- categorie di token e regola che impedisce il doppio conteggio;
- prezzo decimale per categoria e unità di misura;
- finestre temporali e timezone;
- validFrom, validUntil, checkedAt, sourceUrl;
- cambio in EUR, data, provenienza e margine;
- tasse/costi ulteriori inclusi, esclusi o sconosciuti;
- stima massima ammessa per categorie di usage non osservabili.

Il cambio si aggiorna da una fonte configurata o viene inserito manualmente con data. Non aggiungere un nuovo servizio finanziario obbligatorio. Se manca un cambio valido, chiedere di completarlo nelle impostazioni o usare un valore conservativo già approvato, dichiarandolo. Non convertire retroattivamente le chiamate passate al cambio di oggi.

## 4. Ledger atomico

Persistenza in micro-EUR interi. Indicare con C il tetto, S il costo regolato, R le prenotazioni attive e U il costo prudenziale delle chiamate dall'esito incerto.

**Invariante di ammissione: S + R + U + nuovaPrenotazione ≤ C.**

Una transazione BEGIN IMMEDIATE legge il conto, controlla l'invariante, inserisce provider_calls e budget_entries, aumenta R e conclude. Se il controllo fallisce, nessuna chiamata viene inviata. Due task simultanei non possono usare lo stesso residuo.

Stati della chiamata:

| Stato | Significato | Effetto sul budget |
|---|---|---|
| PREPARED | Prenotata, invio non ancora iniziato | Importo in R |
| DISPATCHING | Invio può essere iniziato | R rimane occupato |
| RESPONSE_RECEIVED | Risposta durevole, usage da normalizzare | R rimane fino alla transazione |
| SETTLED | Usage e costo riconciliati | R diminuisce; costo aggiunto a S |
| NOT_SENT | È certo che non è uscita alcuna richiesta | Prenotazione rilasciata |
| UNCERTAIN | Invio possibile, costo non determinabile | Prenotazione trasferita da R a U |

Le transizioni devono essere compare-and-swap e idempotenti. Un callback ripetuto non regola due volte la chiamata. Ogni voce indica callId, evento, delta dei tre contatori e motivo. I contatori memorizzati devono poter essere ricostruiti dal ledger; una divergenza blocca nuove spese e richiede riconciliazione.

Non azzerare il ledger a fine generazione, a inizio export, al cambio modello o al riavvio. La modifica del tetto richiede una transazione con revisione attesa: il nuovo valore deve essere almeno S + R + U e non superare 3.000.000 micro-EUR nella configurazione richiesta. Ridurre il tetto non elimina addebiti o prenotazioni.

## 5. Calcolo della prenotazione

Prenotazione = costo massimo plausibile di input + uscita limitata + categorie aggiuntive, convertito conservativamente in EUR e arrotondato verso l'alto.

Usare un conteggio token del provider quando disponibile senza addebiti non previsti. Altrimenti stimare con un tokenizer compatibile e margine, soprattutto per immagini/PDF e testo multilingue. Il massimo output deve essere un parametro realmente applicato dal provider; un desiderio nel prompt non basta. Tenere conto dei token di reasoning secondo la semantica documentata.

Margine iniziale: 25% sul costo calcolato, configurabile dopo misure. È un margine pratico, non una garanzia per payload non conteggiabili. Se non si può ottenere un limite sufficientemente prudente, dividere/ridimensionare il payload o sospendere. Per una chiamata vicino al cambio di fascia, prenotare la tariffa più alta potenzialmente applicabile.

Rilasciare la differenza tra prenotazione e costo osservato solo con usage completo o evidenza attendibile del provider. Se il costo reale supera la prenotazione, registrare l'intero costo, bloccare nuove chiamate e segnalare BUDGET_ESTIMATE_UNDERRUN: mai falsificare il ledger per rispettare visivamente il cap.

## 6. Casi ambigui, retry e annullamento

Un timeout può avvenire dopo che il provider ha elaborato la richiesta. Abortire la connessione o spegnere il PC non prova l'assenza di costo. La prenotazione diventa U e resta occupata.

Al riavvio, le chiamate DISPATCHING senza esito durevole diventano UNCERTAIN. Se il provider offre un recupero affidabile per request ID, tentare la riconciliazione; altrimenti mantenere l'importo prudenziale e permettere un confronto manuale con il pannello del provider. L'utente può confermare un addebito osservato o l'assenza di addebito, con nota e traccia. Mai un pulsante che azzera silenziosamente tutto.

Ogni retry fisico necessita di nuovo spazio residuo anche se il precedente è incerto. Non attivare retry nascosti nell'SDK. Una risposta invalida ma fatturata rimane un costo; il repair è un'altra chiamata.

Annullare un job impedisce nuovi invii e conserva gli addebiti. Le chiamate in corso possono terminare o restare incerte. Le voci di budget non vengono eliminate con il documento.

## 7. Preventivo comprensibile

Prima di Avvia mostrare:

- fonti e ambito scelti;
- intervallo di costo previsto, con ipotesi principali;
- tetto applicativo e margine disponibile;
- ripartizione indicativa fra lettura, scrittura, revisione e figure;
- modelli selezionati e casi che potrebbero richiedere intervento.

La ripartizione guida il planner; il ledger resta globale. Accantonare almeno il 25% del budget residuo pianificato per revisione/riparazioni prima di spendere tutto nella prima bozza. Se molte figure rendono il piano incompatibile, ridurre con l'utente il numero di figure opzionali o suddividere l'ambito. Le figure necessarie alla comprensione non diventano opzionali per rientrare nascostamente nei costi.

A budget esaurito mostrare WAITING_BUDGET con tre azioni coerenti: aumentare fino a 3 € se possibile, restringere l'ambito creando una nuova revisione del piano, oppure conservare/esportare la bozza segnalata. L'app non riduce automaticamente la qualità scientifica.

## 8. Esempio aritmetico, non preventivo reale

Ipotesi puramente illustrative: cambio 0,90 EUR/USD e 0,15 EUR/CNY; tutti i token indicati includono quelli fatturabili dei compiti scelti; nessuno storage o altro servizio. Questi cambi non sono quotazioni verificate.

| Gruppo di chiamate | Input | Output | Calcolo | Costo nella valuta |
|---|---:|---:|---|---:|
| Google 3.5 Flash-Lite | 200.000 | 60.000 | 0,2 × 0,30 + 0,06 × 2,50 | 0,210 USD |
| Google 3.8 Flash, tariffa 2026 | 80.000 | 20.000 | 0,08 × 0,75 + 0,02 × 3,75 | 0,135 USD |
| DeepSeek Flash, fascia piena | 120.000 | 25.000 | 0,12 × 2 + 0,025 × 8 | 0,440 CNY |

Conversione ipotetica: (0,210 + 0,135) × 0,90 + 0,440 × 0,15 = 0,3765 €. Con margine del 25%: 0,470625 €, arrotondato prudenzialmente a 0,48 € per presentazione.

Questo dimostra come calcolare, non quanto costeranno i materiali dell'utente. Centinaia di pagine scansionate, contesto ripetuto, reasoning lungo o molte revisioni possono cambiare molto il costo. Il benchmark misurerà qualità e token effettivi sui campioni.

## 9. Risparmio che non sacrifica contenuti

Riutilizzare estrazioni e capitoli immutati; passare solo fonti pertinenti; non inviare lo stesso PDF a ogni revisore; riparare blocchi specifici; generare SVG localmente; esportare offline; fermare loop ripetitivi; scegliere modelli per compito dopo il benchmark. L'uscita resta sufficientemente ampia per svolgere i passaggi richiesti.

## 10. Accettazione

Testare con prezzi fittizi esatti: doppia prenotazione concorrente vicino al limite, retry incerto, crash dopo invio, usage incompleto, prezzo scaduto, fascia Asia/Shanghai, cambio mancante, costo oltre stima, annullamento e replay della stessa risposta. In tutti i casi il ledger conserva il denaro consumato o potenzialmente consumato. La UI distingue sempre regolato, impegnato, incerto e residuo.

