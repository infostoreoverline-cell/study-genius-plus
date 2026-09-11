import type { StudyVisual } from './visuals.js';

export interface StudyPdfInput {
  title: string;
  sourceName: string;
  content: string;
  visuals: Array<Pick<StudyVisual, 'title' | 'caption'>>;
}

type PdfLine = {
  text: string;
  size: number;
  leading: number;
  after: number;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 49;
const RIGHT_MARGIN = 49;
const TOP_MARGIN = 770;
const BOTTOM_MARGIN = 68;

/**
 * A deliberately small, dependency-free PDF writer. It exports the complete
 * study text locally. The web UI also offers browser printing, which preserves
 * the generated SVG figures in the saved PDF.
 */
export function createStudyPdf(input: StudyPdfInput): Buffer {
  const lines = [
    { text: input.title, size: 20, leading: 25, after: 12 },
    { text: `Fonte: ${input.sourceName}`, size: 10, leading: 14, after: 12 },
    ...markdownToPdfLines(input.content),
    ...(input.visuals.length > 0 ? visualIndexLines(input.visuals) : [])
  ];
  const pages = paginate(lines);
  return buildPdf(pages, input.title);
}

function markdownToPdfLines(markdown: string): PdfLine[] {
  const output: PdfLine[] = [];
  for (const rawLine of markdown.split(/\r?\n/gu)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? 18 : level === 2 ? 14 : 12;
      pushWrapped(output, cleanMarkdown(heading[2]), size, size + 6, 8);
      continue;
    }
    if (line.startsWith('> ')) {
      pushWrapped(output, `Nota: ${cleanMarkdown(line.slice(2))}`, 10, 14, 6);
      continue;
    }
    if (line.startsWith('- ')) {
      pushWrapped(output, `- ${cleanMarkdown(line.slice(2))}`, 10, 14, 2);
      continue;
    }
    pushWrapped(output, cleanMarkdown(line), 10, 14, 5);
  }
  return output;
}

function visualIndexLines(visuals: Array<Pick<StudyVisual, 'title' | 'caption'>>): PdfLine[] {
  const lines: PdfLine[] = [];
  pushWrapped(lines, 'Figure e grafici disponibili nell’app', 14, 20, 7);
  pushWrapped(lines, 'Per includere le figure SVG nel PDF, usa il comando “PDF con SVG” nell’interfaccia.', 10, 14, 7);
  for (const visual of visuals) {
    pushWrapped(lines, `- ${visual.title}: ${visual.caption}`, 10, 14, 2);
  }
  return lines;
}

function pushWrapped(target: PdfLine[], value: string, size: number, leading: number, after: number): void {
  const clean = normalisePdfCharacters(value).trim();
  if (!clean) return;
  const maximum = size >= 18 ? 60 : size >= 14 ? 76 : 96;
  const wrapped = wrapText(clean, maximum);
  wrapped.forEach((text, index) => {
    target.push({ text, size, leading, after: index === wrapped.length - 1 ? after : 0 });
  });
}

function paginate(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = TOP_MARGIN;

  for (const line of lines) {
    const height = line.leading + line.after;
    if (current.length > 0 && y - height < BOTTOM_MARGIN) {
      pages.push(current);
      current = [];
      y = TOP_MARGIN;
    }
    current.push(line);
    y -= height;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[{ text: 'Nessun contenuto disponibile.', size: 10, leading: 14, after: 0 }]];
}

function buildPdf(pages: PdfLine[][], documentTitle: string): Buffer {
  const pageIds = pages.map((_, index) => 4 + index * 2);
  const contentIds = pages.map((_, index) => 5 + index * 2);
  const objects = new Map<number, Buffer>();
  objects.set(1, pdfBuffer('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.set(2, pdfBuffer(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`));
  objects.set(3, pdfBuffer('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));

  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];
    const content = pageContent(page, index + 1, pages.length, documentTitle);
    const stream = Buffer.concat([
      pdfBuffer(`<< /Length ${content.length} >>\nstream\n`),
      content,
      pdfBuffer('\nendstream')
    ]);
    objects.set(pageId, pdfBuffer(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`));
    objects.set(contentId, stream);
  });

  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary');
  const chunks: Buffer[] = [header];
  const offsets: number[] = [0];
  let offset = header.length;
  const totalObjects = 3 + pages.length * 2;
  for (let id = 1; id <= totalObjects; id += 1) {
    const object = objects.get(id);
    if (!object) throw new Error(`Oggetto PDF mancante: ${id}`);
    const chunk = Buffer.concat([pdfBuffer(`${id} 0 obj\n`), object, pdfBuffer('\nendobj\n')]);
    offsets[id] = offset;
    chunks.push(chunk);
    offset += chunk.length;
  }
  const xrefOffset = offset;
  chunks.push(pdfBuffer(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`));
  for (let id = 1; id <= totalObjects; id += 1) {
    chunks.push(pdfBuffer(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`));
  }
  chunks.push(pdfBuffer(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));
  return Buffer.concat(chunks);
}

function pageContent(page: PdfLine[], pageNumber: number, pageCount: number, documentTitle: string): Buffer {
  let y = TOP_MARGIN;
  const commands: string[] = [
    'q',
    '0.10 0.46 0.44 rg',
    `0.8 w ${LEFT_MARGIN} 794 m ${PAGE_WIDTH - RIGHT_MARGIN} 794 l S`,
    'Q',
    textCommand(LEFT_MARGIN, 808, 8, documentTitle),
    textCommand(PAGE_WIDTH - RIGHT_MARGIN - 43, 34, 8, `Pagina ${pageNumber} / ${pageCount}`)
  ];
  for (const line of page) {
    commands.push(textCommand(LEFT_MARGIN, y, line.size, line.text));
    y -= line.leading + line.after;
  }
  return pdfBuffer(commands.join('\n'));
}

function textCommand(x: number, y: number, size: number, text: string): string {
  return `BT /F1 ${size} Tf 0.16 0.24 0.34 rg ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function wrapText(value: string, maximum: number): string[] {
  const words = value.split(/\s+/gu).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maximum || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/gu, '$1')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/[*_#]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalisePdfCharacters(value: string): string {
  const replacements: Record<string, string> = {
    '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '•': '-', '€': 'EUR', '≤': '<=', '≥': '>='
  };
  return [...value].map((character) => {
    const replacement = replacements[character];
    if (replacement !== undefined) return replacement;
    const code = character.codePointAt(0) ?? 63;
    return (code >= 32 && code <= 126) || (code >= 160 && code <= 255) ? character : '?';
  }).join('');
}

function escapePdfText(value: string): string {
  return normalisePdfCharacters(value)
    .replace(/\\/gu, '\\\\')
    .replace(/\(/gu, '\\(')
    .replace(/\)/gu, '\\)');
}

function pdfBuffer(value: string): Buffer {
  return Buffer.from(value, 'latin1');
}
