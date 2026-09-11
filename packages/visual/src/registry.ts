import { VisualKind } from 'contracts';
import { FunctionPlotRenderer } from './renderers/function_plot.js';
import { ConceptMapRenderer } from './renderers/concept_map.js';
import { XyPlotRenderer } from './renderers/xy_plot.js';
import { ChemistryRenderer } from './renderers/chemistry.js';
import { FlowDiagramRenderer } from './renderers/flow_diagram.js';
import { PhysicalDiagramRenderer } from './renderers/physical_diagram.js';
import { SourceImageRenderer } from './renderers/source_image.js';
import { CompositeFigureRenderer } from './renderers/composite_figure.js';

export interface Renderer {
  render(spec: any): string;
}

export class VisualRegistry {
  private renderers: Map<VisualKind, Renderer> = new Map();

  constructor() {
    // Register defaults
    this.renderers.set(VisualKind.function_plot, new FunctionPlotRenderer());
    this.renderers.set(VisualKind.concept_map, new ConceptMapRenderer());
    this.renderers.set(VisualKind.xy_plot, new XyPlotRenderer());
    this.renderers.set(VisualKind.chemistry, new ChemistryRenderer());
    this.renderers.set(VisualKind.flow_diagram, new FlowDiagramRenderer());
    this.renderers.set(VisualKind.physical_diagram, new PhysicalDiagramRenderer());
    this.renderers.set(VisualKind.source_image, new SourceImageRenderer());
    this.renderers.set(VisualKind.composite_figure, new CompositeFigureRenderer());
  }

  public getRenderer(kind: VisualKind): Renderer | undefined {
    return this.renderers.get(kind);
  }
}
