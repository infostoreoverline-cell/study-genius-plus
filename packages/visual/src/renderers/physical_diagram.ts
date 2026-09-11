import { VisualSpec, PhysicalDiagramSemanticModel } from 'contracts';

export class PhysicalDiagramRenderer {
  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    const model = spec.semanticModel as PhysicalDiagramSemanticModel;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="physics">`;
    svg += `<defs>
      <marker id="force-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#d00" />
      </marker>
    </defs>`;

    // Mock representation
    svg += `<rect x="${w / 2 - 25}" y="${h / 2 - 25}" width="50" height="50" fill="#aaf" id="body" />`;
    svg += `<line x1="${w / 2}" y1="${h / 2}" x2="${w / 2 + 50}" y2="${h / 2}" stroke="#d00" stroke-width="2" marker-end="url(#force-arrow)" id="vec1" />`;

    svg += `</svg>`;
    return svg;
  }
}
