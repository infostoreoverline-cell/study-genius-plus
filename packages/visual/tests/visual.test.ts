import { describe, it, expect } from 'vitest';
import { SafeMathEvaluator } from '../src/evaluator.js';
import { SvgSanitizer } from '../src/sanitizer.js';
import { VisualCompiler } from '../src/compiler.js';
import { VisualKind, VisualSpec } from 'contracts';

describe('Visual Engine', () => {
  describe('SafeMathEvaluator', () => {
    it('should evaluate safe math operations like ln(e)', () => {
      const evaluator = new SafeMathEvaluator();
      const samples = evaluator.generateSamples('log(e)', [1, 2], {}, [], 2);
      
      expect(samples).toHaveLength(2);
      expect(samples[0].y).toBeCloseTo(1, 5);
    });

    it('should handle discontinuities gracefully (1/x)', () => {
      const evaluator = new SafeMathEvaluator();
      const samples = evaluator.generateSamples('1/x', [-1, 1], {}, [0], 3);
      
      // Samples at x = -1, 0, 1
      expect(samples[0].y).toBe(-1);
      expect(samples[1].y).toBeNull(); // The excluded point
      expect(samples[2].y).toBe(1);
    });

    it('should block assignments', () => {
      const evaluator = new SafeMathEvaluator();
      expect(() => {
        evaluator.generateSamples('a = 5', [0, 1], {}, [], 2);
      }).toThrow('Assignments are not allowed');
    });

    it('should block arbitrary global function access', () => {
      const evaluator = new SafeMathEvaluator();
      const samples = evaluator.generateSamples('evaluate("1+1")', [0, 1], {}, [], 2);
      expect(samples[0].y).toBeNull();
      expect(samples[1].y).toBeNull();
    });
  });

  describe('SvgSanitizer', () => {
    it('should prefix ids', () => {
      const sanitizer = new SvgSanitizer();
      const raw = '<svg><g id="my-group"></g><path fill="url(#my-group)"/></svg>';
      const sanitized = sanitizer.sanitize(raw, 'test-id');
      
      expect(sanitized).toContain('id="test-id-my-group"');
      expect(sanitized).toContain('url(#test-id-my-group)');
    });

    it('should reject scripts', () => {
      const sanitizer = new SvgSanitizer();
      const raw = '<svg><script>alert("xss")</script></svg>';
      
      expect(() => sanitizer.sanitize(raw, 'test-id')).toThrow('Script tags are not allowed');
    });

    it('should reject event handlers', () => {
      const sanitizer = new SvgSanitizer();
      const raw = '<svg onload="alert(1)"></svg>';
      
      expect(() => sanitizer.sanitize(raw, 'test-id')).toThrow('Event handlers');
    });
  });

  describe('VisualCompiler', () => {
    it('should compile a basic function plot to sanitized SVG', () => {
      const compiler = new VisualCompiler();
      
      const spec: VisualSpec = {
        schemaVersion: '1.0',
        visualId: 'fig-123',
        revision: 1,
        kind: VisualKind.function_plot,
        intent: { purpose: 'Test', required: true, requirementIds: [] },
        sourceRefs: [],
        provenance: 'synthetic',
        accessibility: { title: 'T', description: 'D' },
        presentation: { widthCssPx: 500, heightCssPx: 500 },
        semanticModel: {
          x: { symbol: 'x', unit: '1', domain: [0, 10] },
          y: { symbol: 'y', unit: '1' },
          series: [
            { id: 's1', expression: 'x*2', parameters: {} }
          ],
          assumptions: []
        }
      };

      const svg = compiler.compile(spec);
      expect(svg).toContain('<svg');
      expect(svg).toContain('id="fig-123-s1"'); // Sanitizer prefixes the series id
    });

    it('should compile new renderers (chemistry, flow, physical, source, composite)', () => {
      const compiler = new VisualCompiler();
      const specTemplate: VisualSpec = {
        schemaVersion: '1.0',
        visualId: 'fig-456',
        revision: 1,
        kind: VisualKind.chemistry,
        intent: { purpose: 'Test', required: true, requirementIds: [] },
        sourceRefs: [],
        provenance: 'synthetic',
        accessibility: { title: 'T', description: 'D' },
        presentation: { widthCssPx: 500, heightCssPx: 500 },
        semanticModel: {}
      };

      const chem = compiler.compile({ ...specTemplate, kind: VisualKind.chemistry, semanticModel: { smiles: 'C' } });
      expect(chem).toContain('<svg');
      expect(chem).toContain('C');

      const flow = compiler.compile({ ...specTemplate, kind: VisualKind.flow_diagram, semanticModel: { nodes: [{id: '1', label: 'Start'}], edges: [] } });
      expect(flow).toContain('Start');

      const phys = compiler.compile({ ...specTemplate, kind: VisualKind.physical_diagram, semanticModel: { bodies: [], vectors: [], constraints: [] } });
      expect(phys).toContain('<svg');

      const src = compiler.compile({ ...specTemplate, kind: VisualKind.source_image, semanticModel: { assetUrl: 'http://test' } });
      expect(src).toContain('http://test');

      const comp = compiler.compile({ ...specTemplate, kind: VisualKind.composite_figure, semanticModel: { panels: [] } });
      expect(comp).toContain('<svg');
    });
  });
});
