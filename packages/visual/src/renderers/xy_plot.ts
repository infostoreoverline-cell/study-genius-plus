import { VisualSpec } from 'contracts';

export class XyPlotRenderer {
  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="xy">
      <circle cx="50" cy="50" r="4" fill="red" id="pt1" />
    </svg>`;
  }
}
