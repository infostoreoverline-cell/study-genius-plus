import { VisualSpec } from 'contracts';

export class ConceptMapRenderer {
  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    
    // Very simple mock output for concept map
    // In a real implementation this would map semantic nodes and edges
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="map">
      <rect x="10" y="10" width="100" height="50" stroke="black" fill="white" id="node1" />
      <text x="60" y="40" text-anchor="middle">Mock Concept</text>
    </svg>`;
  }
}
