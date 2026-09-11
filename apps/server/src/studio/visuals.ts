import type { StudioProfile } from './generator.js';

export type StudyVisualKind = 'concept-map' | 'study-flow' | 'term-frequency';

export interface StudyVisual {
  title: string;
  kind: StudyVisualKind;
  svg: string;
  altText: string;
  caption: string;
}

export interface StudyVisualInput {
  title: string;
  sourceName: string;
  sourceText: string;
  profile: StudioProfile;
  evidenceJson?: string;
}

type RankedTerm = {
  term: string;
  count: number;
};

const STOP_WORDS = new Set([
  'agli', 'alla', 'alle', 'anche', 'avere', 'che', 'come', 'con', 'dalla', 'dalle', 'della', 'delle', 'degli', 'dello',
  'dopo', 'dove', 'dunque', 'ed', 'essere', 'fra', 'gli', 'inoltre', 'loro', 'mentre', 'nella', 'nelle', 'nello',
  'non', 'ogni', 'per', 'quale', 'questa', 'queste', 'questi', 'questo', 'saranno', 'sarebbe', 'siano', 'sono',
  'sopra', 'sotto', 'sulla', 'sulle', 'sullo', 'tale', 'tutti', 'tutto', 'una', 'uno', 'verso', 'with', 'from',
  'that', 'this', 'there', 'have', 'will', 'into', 'your', 'their', 'sono', 'come', 'quindi', 'quando', 'oltre',
  'dell', 'dall', 'nell', 'sull', 'the', 'and', 'for', 'del', 'dei', 'dal', 'dei', 'all', 'alla', 'alla'
]);

/**
 * Creates visual study aids from the locally extracted text or Gemini structured evidence.
 */
export function createStudyVisuals(input: StudyVisualInput): StudyVisual[] {
  let rankedTerms: RankedTerm[] = [];
  
  if (input.evidenceJson) {
    try {
      const evidence = JSON.parse(input.evidenceJson);
      const allConcepts: string[] = [];
      for (const page of evidence.pages || []) {
        if (Array.isArray(page.concepts)) {
          allConcepts.push(...page.concepts);
        }
      }
      
      const counts = new Map<string, number>();
      for (const concept of allConcepts) {
        const cleaned = concept.toLocaleLowerCase('it').trim();
        if (cleaned.length < 4 || STOP_WORDS.has(cleaned)) continue;
        counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
      }
      rankedTerms = [...counts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'it'))
        .slice(0, 6)
        .map(([term, count]) => ({ term, count }));
    } catch (e) {
      console.warn("Failed to parse evidence JSON for SVG", e);
      rankedTerms = extractRankedTerms(input.sourceText, 6);
    }
  } else {
    rankedTerms = extractRankedTerms(input.sourceText, 6);
  }
  
  const terms = rankedTerms.map(({ term }) => term);
  const hasEnoughTerms = terms.length >= 3;
  const safeTerms = hasEnoughTerms ? terms : fallbackTerms(input.profile);

  return [
    createConceptMap(input.title, input.sourceName, safeTerms, hasEnoughTerms),
    createStudyFlow(input.title, input.profile),
    rankedTerms.length > 0
      ? createTermFrequencyChart(input.title, input.sourceName, rankedTerms)
      : createUnavailableTermFrequencyChart(input.title, input.sourceName)
  ];
}

function createConceptMap(title: string, sourceName: string, terms: string[], sourceGrounded: boolean): StudyVisual {
  const positions = [
    [210, 130], [540, 105], [870, 130], [175, 465], [540, 530], [905, 465]
  ] as const;
  const nodeMarkup = terms.slice(0, positions.length).map((term, index) => {
    const [x, y] = positions[index];
    const label = truncate(term, 24);
    return `
      <line x1="540" y1="320" x2="${x}" y2="${y}" stroke="#8dc7bd" stroke-width="3" stroke-linecap="round" />
      <g>
        <rect x="${x - 116}" y="${y - 38}" width="232" height="76" rx="18" fill="#ffffff" stroke="#b9ded7" stroke-width="2" />
        <text x="${x}" y="${y + 7}" fill="#173642" font-family="Arial, sans-serif" font-size="20" font-weight="700" text-anchor="middle">${escapeXml(label)}</text>
      </g>`;
  }).join('');
  const visualTitle = `Mappa concettuale — ${truncate(title, 54)}`;
  const description = sourceGrounded
    ? `Mappa generata dai concetti più ricorrenti nel testo estratto da ${sourceName}.`
    : `Schema di studio generato dal profilo perché il testo estratto da ${sourceName} non contiene abbastanza termini distinguibili.`;
  const svg = svgDocument(visualTitle, description, `
    <rect width="1080" height="640" rx="32" fill="#f4fbf9" />
    <path d="M0 548 C215 492 331 659 561 564 C755 483 886 527 1080 438 V640 H0Z" fill="#dff4ee" opacity=".9" />
    <text x="58" y="66" fill="#55706f" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1.6">MAPPA CONCETTUALE</text>
    <text x="58" y="96" fill="#253e50" font-family="Arial, sans-serif" font-size="20">Concetti ricorrenti nella fonte</text>
    ${nodeMarkup}
    <g>
      <rect x="400" y="269" width="280" height="102" rx="24" fill="#197d78" />
      <text x="540" y="310" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="700" text-anchor="middle">${escapeXml(truncate(title, 32))}</text>
      <text x="540" y="338" fill="#d9fbf2" font-family="Arial, sans-serif" font-size="14" text-anchor="middle">centro del ripasso</text>
    </g>
    <text x="58" y="600" fill="#6e858a" font-family="Arial, sans-serif" font-size="13">${escapeXml(sourceGrounded ? 'Basata sulle parole più presenti nel testo estratto — verifica sempre il contesto originale.' : 'Testo poco distinguibile: usa questa mappa solo come checklist di studio.')}</text>
  `);

  return {
    title: 'Mappa concettuale',
    kind: 'concept-map',
    svg,
    altText: description,
    caption: sourceGrounded
      ? 'Una mappa di ripasso costruita dai concetti più ricorrenti nella fonte; non sostituisce le relazioni presenti nelle pagine originali.'
      : 'Il testo non ha fornito abbastanza termini distinguibili: questa è una checklist del profilo, non una mappa semantica della fonte.'
  };
}

function createStudyFlow(title: string, profile: StudioProfile): StudyVisual {
  const steps = flowStepsForProfile(profile);
  const cardWidth = 214;
  const startX = 68;
  const y = 276;
  const cards = steps.map((step, index) => {
    const x = startX + index * 250;
    const isLast = index === steps.length - 1;
    const connector = isLast ? '' : `
      <path d="M${x + cardWidth + 10} ${y + 42} H${x + 240}" stroke="#7ebeb4" stroke-width="3" stroke-linecap="round" />
      <path d="M${x + 238} ${y + 35} L${x + 248} ${y + 42} L${x + 238} ${y + 49}" fill="none" stroke="#7ebeb4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="84" rx="19" fill="#ffffff" stroke="#c9e4df" stroke-width="2" />
        <circle cx="${x + 27}" cy="${y + 27}" r="14" fill="#e3f5ef" />
        <text x="${x + 27}" y="${y + 32}" fill="#187873" font-family="Arial, sans-serif" font-size="14" font-weight="700" text-anchor="middle">${index + 1}</text>
        <text x="${x + 50}" y="${y + 34}" fill="#284354" font-family="Arial, sans-serif" font-size="16" font-weight="700">${escapeXml(truncate(step[0], 23))}</text>
        <text x="${x + 22}" y="${y + 62}" fill="#627884" font-family="Arial, sans-serif" font-size="13">${escapeXml(truncate(step[1], 33))}</text>
      </g>${connector}`;
  }).join('');
  const visualTitle = `Schema di studio — ${truncate(title, 54)}`;
  const description = `Sequenza di controllo suggerita dal profilo ${profile.name} per studiare la fonte.`;
  const svg = svgDocument(visualTitle, description, `
    <rect width="1080" height="640" rx="32" fill="#f7f9ff" />
    <circle cx="961" cy="94" r="156" fill="#e3edff" />
    <circle cx="75" cy="603" r="158" fill="#e1f7f1" />
    <text x="58" y="72" fill="#62719a" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1.6">SCHEMA DI STUDIO</text>
    <text x="58" y="108" fill="#253e50" font-family="Arial, sans-serif" font-size="27" font-weight="700">${escapeXml(profile.name)}: come ricostruire il ragionamento</text>
    <text x="58" y="142" fill="#64748a" font-family="Arial, sans-serif" font-size="16">${escapeXml(truncate(profile.focus, 104))}</text>
    ${cards}
    <rect x="236" y="448" width="608" height="70" rx="20" fill="#253f61" />
    <text x="540" y="478" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="700" text-anchor="middle">Usalo come checklist, poi torna sempre al passaggio originale.</text>
    <text x="540" y="502" fill="#c9d9ef" font-family="Arial, sans-serif" font-size="14" text-anchor="middle">${escapeXml(truncate(title, 70))}</text>
  `);

  return {
    title: 'Schema di studio',
    kind: 'study-flow',
    svg,
    altText: description,
    caption: `Checklist visiva per il profilo ${profile.name}; indica un metodo di studio, non nuovi contenuti della fonte.`
  };
}

function createTermFrequencyChart(title: string, sourceName: string, terms: RankedTerm[]): StudyVisual {
  const normalized = terms.slice(0, 6);
  const maximum = Math.max(...normalized.map((item) => item.count), 1);
  const chartX = 232;
  const chartWidth = 692;
  const startY = 194;
  const barGap = 56;
  const bars = normalized.map((item, index) => {
    const y = startY + index * barGap;
    const width = Math.max(8, Math.round((item.count / maximum) * chartWidth));
    return `
      <text x="202" y="${y + 19}" fill="#3b5263" font-family="Arial, sans-serif" font-size="16" font-weight="700" text-anchor="end">${escapeXml(truncate(item.term, 20))}</text>
      <rect x="${chartX}" y="${y}" width="${chartWidth}" height="28" rx="14" fill="#e5eeef" />
      <rect x="${chartX}" y="${y}" width="${width}" height="28" rx="14" fill="${index % 2 === 0 ? '#26938d' : '#6378bc'}" />
      <text x="${Math.min(chartX + width + 13, 980)}" y="${y + 20}" fill="#506778" font-family="Arial, sans-serif" font-size="14" font-weight="700">${item.count}</text>`;
  }).join('');
  const visualTitle = `Grafico di frequenza — ${truncate(title, 54)}`;
  const description = `Grafico delle occorrenze dei termini più ricorrenti nel testo estratto da ${sourceName}.`;
  const svg = svgDocument(visualTitle, description, `
    <rect width="1080" height="640" rx="32" fill="#fbfcff" />
    <rect x="42" y="40" width="996" height="560" rx="26" fill="#ffffff" stroke="#e1e8f2" stroke-width="2" />
    <text x="80" y="86" fill="#61719a" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1.6">GRAFICO DI LETTURA</text>
    <text x="80" y="122" fill="#253e50" font-family="Arial, sans-serif" font-size="27" font-weight="700">Frequenza dei concetti nella fonte</text>
    <text x="80" y="153" fill="#6b7b90" font-family="Arial, sans-serif" font-size="15">Conteggio nel testo estratto: non rappresenta valori o misure della materia.</text>
    ${bars}
    <text x="80" y="563" fill="#7c8b9c" font-family="Arial, sans-serif" font-size="13">Fonte: ${escapeXml(truncate(sourceName, 90))} · usa il grafico per decidere cosa ripassare, non per dedurre nessi causali.</text>
  `);

  return {
    title: 'Grafico dei concetti',
    kind: 'term-frequency',
    svg,
    altText: description,
    caption: 'Un grafico di occorrenza dei termini nel testo estratto. È un indicatore di copertura della fonte, non un grafico di dati disciplinari.'
  };
}

function createUnavailableTermFrequencyChart(title: string, sourceName: string): StudyVisual {
  const visualTitle = `Grafico non disponibile — ${truncate(title, 54)}`;
  const description = `Il testo estratto da ${sourceName} non contiene termini sufficienti per un grafico di frequenza affidabile.`;
  const svg = svgDocument(visualTitle, description, `
    <rect width="1080" height="640" rx="32" fill="#fbfcff" />
    <rect x="42" y="40" width="996" height="560" rx="26" fill="#ffffff" stroke="#e1e8f2" stroke-width="2" />
    <circle cx="540" cy="275" r="74" fill="#eef4ff" />
    <text x="540" y="299" fill="#6278ba" font-family="Arial, sans-serif" font-size="44" font-weight="700" text-anchor="middle">?</text>
    <text x="540" y="405" fill="#2d4658" font-family="Arial, sans-serif" font-size="25" font-weight="700" text-anchor="middle">Grafico non disponibile</text>
    <text x="540" y="438" fill="#687a90" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">Il testo estratto non contiene termini sufficienti per un conteggio affidabile.</text>
    <text x="540" y="537" fill="#7c8b9c" font-family="Arial, sans-serif" font-size="13" text-anchor="middle">Fonte: ${escapeXml(truncate(sourceName, 90))}</text>
  `);
  return {
    title: 'Grafico dei concetti',
    kind: 'term-frequency',
    svg,
    altText: description,
    caption: 'Nessun grafico numerico è stato creato: il testo estratto non contiene termini sufficienti per una misura affidabile.'
  };
}

function extractRankedTerms(text: string, maximum: number): RankedTerm[] {
  const counts = new Map<string, number>();
  for (const word of text.toLocaleLowerCase('it').match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? []) {
    if (word.length < 4 || STOP_WORDS.has(word) || /^\d+$/u.test(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'it'))
    .slice(0, maximum)
    .map(([term, count]) => ({ term, count }));
}

function fallbackTerms(profile: StudioProfile): string[] {
  if (profile.id === 'fisica') return ['grandezze', 'ipotesi', 'relazioni', 'controlli'];
  if (profile.id === 'matematica') return ['definizioni', 'ipotesi', 'passaggi', 'verifica'];
  if (profile.id === 'chimica') return ['specie', 'vincoli', 'reazioni', 'verifica'];
  return ['concetti', 'relazioni', 'evidenze', 'ripasso'];
}

function flowStepsForProfile(profile: StudioProfile): Array<[string, string]> {
  switch (profile.id) {
    case 'fisica':
      return [
        ['Dati e sistema', 'grandezze e contesto'],
        ['Ipotesi', 'modello e vincoli'],
        ['Relazioni', 'formule e passaggi'],
        ['Controllo', 'unita e risultato']
      ];
    case 'matematica':
      return [
        ['Definizioni', 'oggetti e notazione'],
        ['Ipotesi', 'condizioni iniziali'],
        ['Passaggi', 'logica e calcoli'],
        ['Tesi', 'verifica finale']
      ];
    case 'chimica':
      return [
        ['Specie e dati', 'reagenti e condizioni'],
        ['Vincoli', 'cariche e stati'],
        ['Relazione', 'reazione o modello'],
        ['Controllo', 'bilanciamento e unita']
      ];
    default:
      return [
        ['Concetti', 'definizioni chiave'],
        ['Relazioni', 'cause e conseguenze'],
        ['Evidenze', 'passaggi della fonte'],
        ['Ripasso', 'domande e verifica']
      ];
  }
}

function svgDocument(title: string, description: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="640" viewBox="0 0 1080 640" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <desc>${escapeXml(description)}</desc>${body}
</svg>`;
}

function truncate(value: string, maximum: number): string {
  const clean = value.replace(/\s+/gu, ' ').trim();
  return clean.length > maximum ? `${clean.slice(0, Math.max(1, maximum - 1)).trimEnd()}…` : clean;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');
}
