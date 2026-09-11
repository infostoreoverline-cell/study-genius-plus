# G — Gateway IA, Google e DeepSeek

Dipendenze: 04–06 e 09. Tutte le chiamate reali passano da questo gateway, comprese OCR, classificazione, prove delle credenziali, revisioni, continuazioni e correzioni.

## 1. Catalogo verificato e aggiornabile

Verifica documentale: 11 settembre 2026. Le voci sotto sono una base di configurazione; la disponibilità dell'account e la compatibilità dell'SDK vanno controllate nella milestone di integrazione.

| Modello documentato | Capacità rilevanti | Ruolo iniziale da confrontare sul benchmark |
|---|---|---|
| Google gemini-3.5-flash-lite | Testo e immagini/documenti in ingresso, testo/JSON in uscita, thinking | Classificazione, piano semplice, prima scrittura a basso costo |
| Google gemini-3.8-flash | Ingresso multimodale, testo/JSON in uscita, thinking | Verifica scientifica mirata, figure e passaggi difficili |
| DeepSeek deepseek-flash | Modello V4.1 Flash documentato, testo e visione | Scrittura, derivazioni, revisione alternativa e visione se collaudata |
| DeepSeek deepseek-v4-pro | Voce presente nel listino alla data di verifica | Opzione manuale dopo controllo dell'instradamento effettivo |

Google documenta per i primi due modelli un contesto di 1.048.576 token e un massimo di uscita di 65.536. Sono limiti di servizio, non dimensioni consigliate per una singola richiesta dell'app. DeepSeek documenta limiti diversi: leggerli dalla scheda applicabile e tenere l'uscita dell'app molto più piccola. [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [DeepSeek: listino e capacità](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/).

**Avviso concreto di aggiornamento:** DeepSeek annuncia un cambiamento di instradamento di deepseek-v4-pro dal 14 settembre 2026 alle 12:00 di Pechino. La scelta predefinita non deve dipendere dall'idea che un alias identifichi per sempre la stessa versione. Memorizzare nome richiesto, versione dichiarata dal provider quando disponibile e data del catalogo. [Documentazione iniziale DeepSeek](https://api-docs.deepseek.com/).

Non ricostruire il progetto copiando un elenco rigido di vecchi alias Google o DeepSeek. Il catalogo locale è versionato e modificabile dalla schermata Modelli; un aggiornamento non altera retroattivamente job, prompt o prezzi registrati.

## 2. Contratto unico

Definire almeno questi tipi TypeScript dai relativi schemi:

```ts
type AiRole =
  | "SOURCE_READING" | "PLANNING" | "WRITING"
  | "SCIENTIFIC_REVIEW" | "VISUAL_REVIEW" | "REPAIR"
  | "UTILITY";

interface AiRequest {
  requestId: string;
  jobId: string | null;
  taskId: string | null;
  budgetAccountId: string;
  role: AiRole;
  accountId: string;
  modelId: string;
  systemInstruction: string;
  input: readonly InputPart[];
  responseSchemaId: string | null;
  outputTokenLimit: number;
  reasoningProfile: "economy" | "balanced" | "deep";
  deadlineMs: number;
  contextManifestId: string;
}
interface AiResult {
  providerRequestId: string | null;
  requestedModelId: string;
  reportedModelId: string | null;
  output: readonly OutputPart[];
  finishReason: "complete" | "length" | "blocked" | "tool_call" | "unknown";
  usage: NormalizedUsage;
  rawUsageArtifactId: string | null;
  responseArtifactId: string;
}
```

InputPart distingue testo, immagine e documento; i riferimenti ai file sono risolti soltanto dal server. NormalizedUsage distingue input non in cache, input in cache, output, reasoning, immagini e campi mancanti. Il formato non presume che tutte queste categorie siano fatturate separatamente: la formula tariffaria del provider governa il calcolo.

AiRequest è un contratto applicativo, non un payload da spedire tale e quale a un SDK. Ogni adapter converte richiesta, errori, uso e risposta. I payload originali redatti sono conservabili in diagnostica; mai includere Authorization.

## 3. Sequenza di chiamata obbligatoria

1. Risolvere account e versione della credenziale dal SecretStore.
2. Validare ruolo, modalità, capacità del modello e dimensioni di input/uscita.
3. Selezionare un prezzo applicabile e il relativo cambio; rifiutare una stima a zero per prezzi sconosciuti.
4. Ottenere la prenotazione dal budget e il permesso dalla coda delle quote.
5. Registrare la chiamata fisica come preparata. Un solo punto autorizza l'invio.
6. Invocare l'adapter con timeout/abort e retry dell'SDK disabilitati.
7. Conservare risposta e usage, classificare l'esito e regolare la prenotazione in transazione.
8. Validare schema locale e finishReason prima di dichiarare il task riuscito.
9. Un'eventuale correzione o fallback è una nuova chiamata registrata, con una nuova prenotazione.

Separare errore di trasporto, rifiuto del modello, risposta troncata, schema invalido e contenuto didatticamente errato. Un HTTP 200 non equivale a un capitolo valido.

## 4. Adapter Google

La documentazione corrente mostra il pacchetto @google/genai e l'interfaccia Interactions. Implementare l'adapter sull'interfaccia ufficiale disponibile nella versione SDK fissata in M00; verificare esplicitamente serializzazione multimodale, streaming, schema di risposta e usage. Il percorso legacy presente nella vecchia repository non prova che debba essere rimosso: può essere mantenuto solo dietro lo stesso contratto, se supportato e testato. [Generazione testo](https://ai.google.dev/gemini-api/docs/text-generation).

Mappare systemInstruction alla proprietà prevista dal metodo scelto, il profilo di reasoning ai livelli realmente accettati dal modello e lo schema canonico al sottoinsieme supportato. Per Gemini 3.8 Flash la scheda documenta low, medium e high; non mandare minimal per supposizione. [Scheda modello](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).

Structured output migliora il formato, ma non certifica contenuti o citazioni. Adattare eventuali keyword JSON Schema non supportate e validare comunque con lo schema canonico locale. La documentazione corrente descrive response_format nell'interfaccia Interactions: copiare il payload solo dopo aver verificato l'SDK installato. [Structured output Google](https://ai.google.dev/gemini-api/docs/structured-output).

Quando il provider dispone di conversazioni persistenti o file remoti, non renderli l'unica copia del contesto: l'app salva il proprio dossier e può ricostruire il job. Non abilitare ricerca web, tool remoti o altri servizi a pagamento implicitamente.

## 5. Adapter DeepSeek

Utilizzare il protocollo ufficialmente compatibile con OpenAI all'endpoint DeepSeek configurato nell'adapter. La compatibilità del protocollo non implica usare modelli OpenAI né inviare dati a OpenAI. Il base URL è fisso nel profilo ufficiale; eventuali endpoint personalizzati richiedono una funzione separata, disattivata nella versione iniziale. [DeepSeek API](https://api-docs.deepseek.com/).

DeepSeek oggi documenta anche l'ingresso visuale per deepseek-flash: non applicare il vecchio presupposto “DeepSeek soltanto testo”. L'app usa immagini locali convertite dal server in un payload ammesso; non accetta URL da un documento come destinazioni da scaricare. Verificare dimensione, formato, detail e uso fatturabile nel test dell'adapter. [Visione DeepSeek](https://api-docs.deepseek.com/guides/vision/).

La disponibilità del JSON mode non autorizza a trattare qualsiasi testo come JSON valido. Implementare un parser strettamente delimitato, validazione locale e al massimo una riparazione strutturale entro budget. Non eliminare interi passaggi matematici per far entrare la risposta nello schema.

Non memorizzare il ragionamento interno del modello come materiale didattico o requisito del sistema. Richiedere nel normale output la spiegazione verificabile dei passaggi e le evidenze.

## 6. Routing, risparmio e alternative

Impostazione predefinita proposta: profilo Bilanciato. Il benchmark del documento 15 decide il modello iniziale per materia e compito; la scelta non si basa solo sul prezzo dichiarato.

| Profilo | Scrittura | Revisione | Vincolo |
|---|---|---|---|
| Economico | Modello più economico che supera il benchmark della materia | Controlli locali + revisione mirata dei punti a rischio | Stessi blocchi scientifici obbligatori |
| Bilanciato | Migliore rapporto qualità/costo misurato | Revisione di derivazioni e figure, con secondo modello quando utile | Predefinito, budget 2 € |
| Qualità | Più contesto e revisione indipendente mirata | Escalation esplicita sulle difficoltà | Sempre entro il tetto scelto, massimo 3 € |

Un fallback conserva ruolo, lingua, schema, capacità necessarie e budget. Un modello senza visione non può sostituire il revisore di una figura. Se nessun modello compatibile è disponibile, il job attende; non produce una falsa approvazione.

Per i compiti difficili, cambiare modello dopo un fallimento motivato può essere più utile di tre richieste identiche. Evitare “votazioni” di molti modelli su ogni paragrafo: spendono budget senza una misura affidabile della verità.

## 7. Quote e concorrenza

Google applica le quote per progetto, non per chiave. Due chiavi dello stesso progetto devono condividere lo stesso gruppo di quota configurato dall'utente. Non derivare il project ID dall'hash della chiave. Considerare RPM, TPM e RPD; l'interfaccia mostra che l'app conosce solo il proprio utilizzo, non quello di altri client. Il reset giornaliero segue la regola del provider, non la mezzanotte italiana. [Rate limits Google](https://ai.google.dev/gemini-api/docs/rate-limits).

Il controller gestisce gruppi di quota e un massimo globale di 2 chiamate contemporanee. Rispetta Retry-After, applica backoff esponenziale con jitter e sospende il gruppo su 429 ripetuti. Non ruota chiavi per aggirare le quote di progetto.

Limiti iniziali applicativi: timeout normale 120 secondi, massimo configurabile 300 per task complessi; fino a 3 tentativi fisici complessivi per task, compreso il primo. Una richiesta dall'esito ambiguo segue la gestione economica del documento 09 prima di essere ripetuta.

## 8. Criteri di accettazione

Entrambi i provider passano la stessa suite di contratti con fixture reali redatte e un piccolo smoke test autorizzato nel budget. I test coprono testo, immagine ove disponibile, output conforme/non conforme, troncamento, usage mancante, timeout, 429, 401, rifiuto e modello rimosso. Ogni evento mostra il modello realmente chiamato; il ruolo VISUAL_REVIEW non viene instradato silenziosamente come revisione generica.

