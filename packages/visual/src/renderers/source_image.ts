import { VisualSpec, SourceImageSemanticModel } from 'contracts';

export class SourceImageRenderer {
  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    const model = spec.semanticModel as SourceImageSemanticModel;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="source">`;
    svg += `<image href="${model.assetUrl}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" id="img" />`;
    svg += `</svg>`;
    
    return svg;
  }
}
