import { VisualSpec, FunctionPlotSemanticModel } from 'contracts';
import { SafeMathEvaluator } from '../evaluator.js';

export class FunctionPlotRenderer {
  private evaluator: SafeMathEvaluator;

  constructor() {
    this.evaluator = new SafeMathEvaluator();
  }

  public render(spec: VisualSpec): string {
    const { widthCssPx: w, heightCssPx: h } = spec.presentation;
    const model = spec.semanticModel as FunctionPlotSemanticModel;
    
    // Very simple SVG generator for demonstration
    // Maps [xMin, xMax] to [0, w]
    // Maps [yMin, yMax] to [h, 0] (SVG y goes down)
    const [xMin, xMax] = model.x.domain;
    // Basic assumption for Y domain for now
    const yMin = -10;
    const yMax = 10;

    const mapX = (x: number) => ((x - xMin) / (xMax - xMin)) * w;
    const mapY = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" id="plot">`;
    
    // Add axes
    const yZero = mapY(0);
    const xZero = mapX(0);
    svg += `<line x1="0" y1="${yZero}" x2="${w}" y2="${yZero}" stroke="black" />`;
    svg += `<line x1="${xZero}" y1="0" x2="${xZero}" y2="${h}" stroke="black" />`;

    // Render series
    for (const series of model.series) {
      const samples = this.evaluator.generateSamples(
        series.expression,
        model.x.domain,
        series.parameters,
        series.excludedPoints || []
      );

      let d = '';
      for (const pt of samples) {
        if (pt.y === null) {
          // Discontinuity, wait for next valid point
          continue;
        }

        const px = mapX(pt.x);
        const py = mapY(pt.y);

        if (d === '' || samples[samples.indexOf(pt) - 1]?.y === null) {
          d += `M ${px} ${py} `;
        } else {
          d += `L ${px} ${py} `;
        }
      }

      svg += `<path d="${d}" fill="none" stroke="blue" stroke-width="2" id="${series.id}" />`;
    }

    svg += `</svg>`;
    return svg;
  }
}
