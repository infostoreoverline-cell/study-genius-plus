import { describe, it, expect } from 'vitest';
import { LegacyImporter } from '../src/importers/legacy.js';
import { VisualKind } from 'contracts';

describe('LegacyImporter', () => {
  it('should import a json:plot to function_plot', () => {
    const importer = new LegacyImporter();
    const legacy = {
      id: 'old-123',
      type: 'json:plot',
      content: { formula: 'x^2' }
    };
    
    const spec = importer.importBlock(legacy);
    expect(spec.kind).toBe(VisualKind.function_plot);
    expect(spec.visualId).toBe('old-123');
    expect(spec.semanticModel.series[0].expression).toBe('x^2');
  });

  it('should import a json:graph to concept_map', () => {
    const importer = new LegacyImporter();
    const legacy = {
      type: 'json:graph',
      content: { nodes: [{ id: '1', label: 'A' }] }
    };
    
    const spec = importer.importBlock(legacy);
    expect(spec.kind).toBe(VisualKind.concept_map);
    expect(spec.semanticModel.nodes[0].label).toBe('A');
  });

  it('should throw on unknown legacy type', () => {
    const importer = new LegacyImporter();
    const legacy = {
      type: 'unknown-type',
      content: {}
    };
    
    expect(() => importer.importBlock(legacy)).toThrow('Unsupported legacy visual type');
  });
});
