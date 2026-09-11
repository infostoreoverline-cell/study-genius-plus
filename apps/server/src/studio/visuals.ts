import type { StudioProfile } from './generator.js';

export type StudyVisualKind = 'process_schema' | 'xy_chart' | 'table' | 'crop_fallback';

export interface StudyVisual {
  title: string;
  kind: StudyVisualKind;
  svg: string;
  altText: string;
  caption: string;
  pageNumber?: number;
  boundingBox?: [number, number, number, number];
  id?: string;
}

export interface StudyVisualInput {
  title: string;
  sourceName: string;
  sourceText: string;
  profile: StudioProfile;
  evidenceJson?: string;
  // Note: Iterative validation loop is handled at the batch_worker layer.
  // This module only provides the deterministic SVG renderer.
}

export function createStudyVisuals(input: StudyVisualInput): StudyVisual[] {
  const visuals: StudyVisual[] = [];
  if (!input.evidenceJson) return visuals;

  try {
    const evidence = JSON.parse(input.evidenceJson);
    for (const page of evidence.pages || []) {
      for (const fig of page.figures || []) {
        if (!fig.type || !fig.id) continue;
        
        let svg = '';
        if (fig.type === 'process_schema') {
          svg = renderProcessSchema(fig);
        } else if (fig.type === 'xy_chart') {
          svg = renderXyChart(fig);
        } else if (fig.type === 'table') {
          svg = renderTable(fig);
        }

        if (svg) {
          visuals.push({
            title: fig.title || 'Figura',
            kind: fig.type as StudyVisualKind,
            svg,
            caption: fig.caption || '',
            altText: fig.caption || fig.title || '',
            pageNumber: page.pageNumber || 1,
            boundingBox: fig.boundingBox,
            id: fig.id
          });
        }
      }
    }
  } catch (e) {
    console.warn("Failed to parse evidence JSON for SVG", e);
  }

  return visuals;
}

function renderProcessSchema(fig: any): string {
  const nodes = fig.nodes || [];
  const edges = fig.edges || [];
  
  // A simple deterministic layout for process schema.
  // We'll place nodes in a grid or circle.
  let svgContent = '';
  const nodeRadius = 40;
  const positions: Record<string, {x: number, y: number}> = {};
  
  // Arrange in a simple grid
  nodes.forEach((node: any, index: number) => {
    const cols = Math.ceil(Math.sqrt(nodes.length)) || 1;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 150 + col * 250;
    const y = 150 + row * 200;
    positions[node.id] = { x, y };
  });

  // Draw edges
  edges.forEach((edge: any) => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (from && to) {
      svgContent += `
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#2c3e50" />
          </marker>
        </defs>
        <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#2c3e50" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 10}" fill="#34495e" font-size="12" text-anchor="middle" background-color="white">${escapeXml(edge.label || '')}</text>
      `;
    }
  });

  // Draw nodes
  nodes.forEach((node: any) => {
    const pos = positions[node.id];
    svgContent += `
      <circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" fill="#ecf0f1" stroke="#3498db" stroke-width="3" />
      <text x="${pos.x}" y="${pos.y + 4}" fill="#2c3e50" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="middle">${escapeXml(truncate(node.label || '', 15))}</text>
    `;
  });

  const width = 800;
  const height = 600;
  return svgDocument(fig.title || 'Process Schema', fig.caption || '', width, height, svgContent);
}

function renderXyChart(fig: any): string {
  const data = fig.data || [];
  if (data.length === 0) return '';

  const width = 800;
  const height = 500;
  const padding = 60;

  let minX = Math.min(...data.map((d: any) => d.x));
  let maxX = Math.max(...data.map((d: any) => d.x));
  let minY = Math.min(...data.map((d: any) => d.y));
  let maxY = Math.max(...data.map((d: any) => d.y));

  if (minX === maxX) maxX += 1;
  if (minY === maxY) maxY += 1;

  const scaleX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  const scaleY = (y: number) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

  let svgContent = `
    <!-- Axes -->
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#000" stroke-width="2" />
    <line x1="${padding}" y1="${height - padding}" x2="${padding}" y2="${padding}" stroke="#000" stroke-width="2" />
    <text x="${width / 2}" y="${height - 15}" font-size="14" text-anchor="middle">${escapeXml(fig.xAxisLabel || 'X')}</text>
    <text x="20" y="${height / 2}" font-size="14" text-anchor="middle" transform="rotate(-90 20 ${height / 2})">${escapeXml(fig.yAxisLabel || 'Y')}</text>
  `;

  // Draw points and line
  let pathD = '';
  data.forEach((point: any, i: number) => {
    const cx = scaleX(point.x);
    const cy = scaleY(point.y);
    pathD += `${i === 0 ? 'M' : 'L'} ${cx} ${cy} `;
    svgContent += `<circle cx="${cx}" cy="${cy}" r="4" fill="#e74c3c" />`;
    if (point.label) {
      svgContent += `<text x="${cx}" y="${cy - 10}" font-size="10" fill="#333">${escapeXml(point.label)}</text>`;
    }
  });

  if (data.length > 1) {
    svgContent = `<path d="${pathD}" fill="none" stroke="#3498db" stroke-width="2" />` + svgContent;
  }

  return svgDocument(fig.title || 'XY Chart', fig.caption || '', width, height, svgContent);
}

function renderTable(fig: any): string {
  // A table represented in SVG (or we could use HTML, but since the pipeline expects SVG we render SVG rectangles)
  const rows = fig.data || [];
  if (rows.length === 0) return '';
  
  const width = 800;
  const rowHeight = 40;
  const height = rows.length * rowHeight + 40;
  const colWidth = width / (rows[0].length || 1);

  let svgContent = '';
  rows.forEach((row: any[], rIndex: number) => {
    row.forEach((cell: any, cIndex: number) => {
      const x = cIndex * colWidth;
      const y = rIndex * rowHeight;
      const isHeader = rIndex === 0;
      svgContent += `
        <rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="${isHeader ? '#f39c12' : '#ecf0f1'}" stroke="#bdc3c7" stroke-width="1" />
        <text x="${x + 10}" y="${y + 25}" font-size="14" font-family="sans-serif" font-weight="${isHeader ? 'bold' : 'normal'}">${escapeXml(truncate(String(cell), 30))}</text>
      `;
    });
  });

  return svgDocument(fig.title || 'Table', fig.caption || '', width, height, svgContent);
}

function svgDocument(title: string, description: string, width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
  <rect width="100%" height="100%" fill="#ffffff" />
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
