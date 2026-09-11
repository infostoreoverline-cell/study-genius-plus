import { VisualSpec, FlowDiagramSemanticModel } from 'contracts';

export class FlowDiagramRenderer {
  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    const model = spec.semanticModel as FlowDiagramSemanticModel;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="flow">`;
    svg += `<defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
      </marker>
    </defs>`;

    let yOffset = 20;
    // Simple vertical stack for nodes just to have a working output
    for (const node of model.nodes) {
      svg += `<rect x="50" y="${yOffset}" width="120" height="40" fill="#fff" stroke="#333" id="node-${node.id}" />`;
      svg += `<text x="110" y="${yOffset + 25}" text-anchor="middle" font-family="sans-serif">${node.label}</text>`;
      yOffset += 80;
    }

    svg += `</svg>`;
    return svg;
  }
}
