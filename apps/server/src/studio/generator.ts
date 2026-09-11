export type StudioProvider = 'gemini' | 'deepseek';

export interface StudioProfile {
  id: string;
  name: string;
  focus: string;
  rules: readonly string[];
}

export interface StudyGenerationInput {
  title: string;
  sourceName: string;
  sourceText: string;
  profile: StudioProfile;
  mode: string;
}

export const STUDIO_PROFILES: readonly StudioProfile[] = [
  {
    id: 'fisica',
    name: 'Fisica',
    focus: 'concetti, relazioni, ipotesi, grandezze e unità di misura',
    rules: [
      'Distingui chiaramente ipotesi, modello e conclusioni.',
      'Segnala quando mancano unità di misura o condizioni al contorno.'
    ]
  },
  {
    id: 'matematica',
    name: 'Matematica',
    focus: 'definizioni, teoremi, ipotesi e passaggi logici',
    rules: [
      'Separa sempre ipotesi, tesi e dimostrazione.',
      'Non saltare i passaggi logici rilevanti.'
    ]
  },
  {
    id: 'chimica',
    name: 'Chimica',
    focus: 'specie chimiche, reazioni, cariche, stati e stechiometria',
    rules: [
      'Dichiara i dati mancanti prima di dedurre una reazione.',
      'Non inventare coefficienti, cariche o stati di aggregazione.'
    ]
  },
  {
    id: 'generale',
    name: 'Generale',
    focus: 'concetti fondamentali, nessi e definizioni',
    rules: [
      'Non aggiungere informazioni che non sono nella fonte.',
      'Evidenzia ambiguità e punti che meritano verifica.'
    ]
  }
];

const STOP_WORDS = new Set([
  'alla', 'alle', 'anche', 'avere', 'come', 'con', 'dalla', 'dalle', 'della',
  'delle', 'degli', 'dello', 'dopo', 'dove', 'dunque', 'essere', 'fino', 'gli',
  'nelle', 'nello', 'non', 'nella', 'nelle', 'per', 'quale', 'questo', 'questa',
  'queste', 'questi', 'sulla', 'sulle', 'sono', 'stato', 'tutti', 'tutto', 'una',
  'uno', 'degli', 'dello', 'della', 'delle', 'dalle', 'dalla', 'agli', 'alla',
  'dell', 'dall', 'nell', 'sull', 'the', 'that', 'this', 'with', 'from', 'have',
  'will', 'into', 'your', 'sono', 'come', 'alla', 'della', 'nelle', 'quindi',
  'perche', 'perché', 'oltre', 'quando', 'quando', 'sulla', 'degli', 'nello'
]);

export function getDefaultModel(provider: StudioProvider): string {
  return provider === 'gemini' ? 'gemini-2.5-flash' : 'deepseek-chat';
}

export function buildStudyPrompt(input: StudyGenerationInput): string {
  const source = limitText(input.sourceText, 120_000);
  const rules = input.profile.rules.map((rule) => `- ${rule}`).join('\n');

  return `Sei StudyGenius+, un assistente per lo studio universitario. Scrivi in italiano un riassunto rigoroso in Markdown della fonte fornita.

Vincoli non negoziabili:
- Usa esclusivamente le informazioni presenti nella fonte. Non completare con conoscenze esterne.
- Se una parte non e chiara, incompleta o illeggibile, dichiaralo esplicitamente.
- Mantieni formule, simboli, nomi e numeri presenti nella fonte senza alterarne il significato.
- Organizza il risultato con: Titolo, Panoramica, Concetti chiave, Collegamenti logici, Punti da verificare, Domande di ripasso.
- Profilo disciplinare: ${input.profile.name}. Concentrati su ${input.profile.focus}.
${rules}

Progetto: ${input.title}
File sorgente: ${input.sourceName}
Modalita richiesta: ${input.mode}

--- INIZIO FONTE ---
${source}
--- FINE FONTE ---`;
}

export async function generateWithProvider(
  provider: StudioProvider,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  if (provider === 'gemini') {
    type GeminiResponse = {
      text?: unknown;
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    };
    type GeminiClient = {
      models: { generateContent(input: unknown): Promise<GeminiResponse> };
    };
    type GeminiModule = { GoogleGenAI: new (input: { apiKey: string }) => GeminiClient };

    const sdk = await import('@google/genai') as unknown as GeminiModule;
    const client = new sdk.GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: { maxOutputTokens: 4_000 }
    });
    const directText = typeof response.text === 'string' ? response.text : '';
    const partText = response.candidates?.[0]?.content?.parts
      ?.map((part) => typeof part.text === 'string' ? part.text : '')
      .join('') ?? '';
    const output = (directText || partText).trim();
    if (!output) throw new Error('Il provider non ha restituito testo.');
    return output;
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Rispondi solo con il documento Markdown richiesto.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4_000,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`Il provider DeepSeek ha risposto con stato ${response.status}.`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const output = data.choices?.[0]?.message?.content;
  if (typeof output !== 'string' || !output.trim()) {
    throw new Error('Il provider non ha restituito testo.');
  }
  return output.trim();
}

export function createDemoSummary(input: StudyGenerationInput): string {
  const text = normaliseText(input.sourceText);
  const rankedSentences = chooseKeySentences(text, 6);
  const keyTerms = extractKeyTerms(text, 8);
  const sourceNotice = text.length > 120_000
    ? 'La fonte e molto lunga: il riepilogo demo usa i primi 120.000 caratteri disponibili.'
    : 'Il riepilogo e stato costruito localmente a partire dal testo estratto dal file.';
  const profileChecklist = profileReminder(input.profile);

  const concepts = rankedSentences.length > 0
    ? rankedSentences.map((sentence) => `- ${sentence}`).join('\n')
    : '- Non e stato possibile isolare frasi sufficientemente leggibili dalla fonte.';
  const terms = keyTerms.length > 0
    ? keyTerms.map((term) => `- **${term}** — ritrova nel testo la definizione, il contesto e le relazioni con gli altri concetti.`).join('\n')
    : '- Il testo estratto e troppo breve per produrre un glossario affidabile.';
  const questions = keyTerms.slice(0, 4).map((term) => `- Come definiresti **${term}** usando soltanto la fonte?`).join('\n')
    || '- Quali sono le idee principali presentate dalla fonte?';

  return `# ${cleanInline(input.title)}

> Modalita demo locale — nessuna chiave API e nessun contenuto inviato a servizi esterni.

## Fonte

- File: \`${cleanInline(input.sourceName)}\`
- Profilo: ${input.profile.name}
- ${sourceNotice}

## Panoramica

Questo documento raccoglie in forma estrattiva i passaggi piu informativi della fonte. Usalo come prima mappa di studio; per una spiegazione discorsiva e personalizzata, configura facoltativamente un provider AI nelle Impostazioni.

## Concetti chiave emersi dalla fonte

${concepts}

## Glossario da consolidare

${terms}

## Collegamenti logici da ricostruire

${profileChecklist}

## Punti da verificare sulla fonte

- Controlla le pagine che contengono formule, tabelle o immagini: l'estrazione testuale potrebbe non conservarne la struttura visiva.
- Confronta ogni definizione con il passaggio originale prima di usarla in un esame o in una relazione.
- Se il PDF e una scansione senza testo selezionabile, esegui prima un OCR: questa prima release non esegue OCR automatico.

## Domande di ripasso

${questions}
`;
}

function chooseKeySentences(text: string, max: number): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n{2,}/u)
    .map((sentence) => normaliseText(sentence))
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 360)
    .slice(0, 180);

  if (sentences.length === 0) return [];

  const frequencies = wordFrequencies(sentences.join(' '));
  const selected = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: tokenise(sentence).reduce((sum, word) => sum + (frequencies.get(word) ?? 0), 0)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, max)
    .sort((left, right) => left.index - right.index)
    .map(({ sentence }) => sentence);

  return [...new Set(selected)];
}

function extractKeyTerms(text: string, max: number): string[] {
  return [...wordFrequencies(limitText(text, 120_000)).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'it'))
    .slice(0, max)
    .map(([word]) => word);
}

function wordFrequencies(text: string): Map<string, number> {
  const frequencies = new Map<string, number>();
  for (const word of tokenise(text)) {
    if (word.length < 4 || STOP_WORDS.has(word) || /^\d+$/u.test(word)) continue;
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }
  return frequencies;
}

function tokenise(text: string): string[] {
  return text.toLocaleLowerCase('it').match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [];
}

function profileReminder(profile: StudioProfile): string {
  switch (profile.id) {
    case 'fisica':
      return '- Per ogni relazione, annota grandezze coinvolte, ipotesi del modello, sistema di riferimento e unita di misura disponibili nella fonte.';
    case 'matematica':
      return '- Per ogni risultato, separa definizioni, ipotesi, tesi e passaggi della dimostrazione; evidenzia ogni salto non esplicitato.';
    case 'chimica':
      return '- Per ogni reazione o specie, verifica dati, cariche, coefficienti e stati di aggregazione prima di memorizzarla.';
    default:
      return '- Ricostruisci per ogni concetto: definizione, causa o premessa, conseguenza e un esempio contenuto nella fonte.';
  }
}

function normaliseText(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

function limitText(text: string, maximum: number): string {
  return text.length > maximum ? text.slice(0, maximum) : text;
}

function cleanInline(value: string): string {
  return value.replace(/[\r\n`]/gu, ' ').trim();
}
