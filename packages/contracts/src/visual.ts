export const VisualKind = {
  concept_map: 'concept_map',
  function_plot: 'function_plot',
  xy_plot: 'xy_plot',
  flow_diagram: 'flow_diagram',
  physical_diagram: 'physical_diagram',
  chemistry: 'chemistry',
  source_image: 'source_image',
  composite_figure: 'composite_figure'
} as const;

export type VisualKind = typeof VisualKind[keyof typeof VisualKind];

export interface VisualIntent {
  purpose: string;
  required: boolean;
  requirementIds: string[];
}

export interface SemanticModel {
  [key: string]: any;
}

export interface Presentation {
  widthCssPx: number;
  heightCssPx: number;
  theme?: string;
  showLegend?: boolean;
}

export interface Accessibility {
  title: string;
  description: string;
}

export interface VisualSpec {
  schemaVersion: string;
  visualId: string;
  revision: number;
  kind: VisualKind;
  intent: VisualIntent;
  sourceRefs: string[];
  provenance: string;
  semanticModel: SemanticModel;
  presentation: Presentation;
  accessibility: Accessibility;
}

// Function Plot Specific Types
export interface FunctionSeries {
  id: string;
  expression: string;
  parameters: Record<string, number>;
  excludedPoints?: number[];
}

export interface FunctionPlotSemanticModel extends SemanticModel {
  x: { symbol: string; unit: string; domain: [number, number] };
  y: { symbol: string; unit: string };
  series: FunctionSeries[];
  assumptions: string[];
}

export interface ChemistrySemanticModel extends SemanticModel {
  subtype: string;
  smiles?: string;
  reactions?: any[];
  molecules?: any[];
}

export interface FlowDiagramSemanticModel extends SemanticModel {
  nodes: { id: string; label: string; type?: string }[];
  edges: { from: string; to: string; label?: string }[];
}

export interface PhysicalDiagramSemanticModel extends SemanticModel {
  bodies: any[];
  vectors: any[];
  constraints: string[];
}

export interface SourceImageSemanticModel extends SemanticModel {
  assetUrl: string;
  caption?: string;
  crop?: { x: number; y: number; w: number; h: number };
}

export interface CompositeFigureSemanticModel extends SemanticModel {
  panels: { id: string; spec: VisualSpec; layout: any }[];
}
