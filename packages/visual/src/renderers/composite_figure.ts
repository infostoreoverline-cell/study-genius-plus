import { VisualSpec, CompositeFigureSemanticModel } from 'contracts';

export class CompositeFigureRenderer {
  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    const model = spec.semanticModel as CompositeFigureSemanticModel;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="composite">`;
    
    // In a real implementation this would invoke the compiler for each sub-spec.
    // For now we just create bounding boxes.
    for (const panel of model.panels) {
      const { x = 0, y = 0, width = w / 2, height = h / 2 } = panel.layout || {};
      svg += `<g transform="translate(${x}, ${y})" id="panel-${panel.id}">
        <rect width="${width}" height="${height}" fill="none" stroke="#666" stroke-dasharray="4" id="border-${panel.id}"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle">${panel.spec.kind}</text>
      </g>`;
    }
    
    svg += `</svg>`;
    return svg;
  }
}
