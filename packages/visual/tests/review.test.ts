import { describe, it, expect } from 'vitest';
import { VisualSpec, VisualKind, VisualReviewState } from 'contracts';
import { VisualCompiler } from '../src/compiler.js';
import { GeometricChecker } from '../src/review/geometric_checker.js';
import { MultimodalReviewer } from '../src/review/multimodal_reviewer.js';
import { PatchEngine } from '../src/review/patch_engine.js';
import { VisualReviewLoop } from '../src/review/review_loop.js';

describe('VisualReviewLoop', () => {
  it('should accept a flawless spec immediately', async () => {
    const compiler = new VisualCompiler();
    const checker = new GeometricChecker();
    const reviewer = new MultimodalReviewer();
    const patcher = new PatchEngine();
    
    const loop = new VisualReviewLoop(compiler, checker, reviewer, patcher);
    
    const spec: VisualSpec = {
      schemaVersion: '1.0',
      visualId: 'fig-1',
      revision: 1,
      kind: VisualKind.concept_map,
      intent: { purpose: 'Test', required: true, requirementIds: [] },
      sourceRefs: [],
      provenance: 'test',
      presentation: { widthCssPx: 800, heightCssPx: 600 },
      accessibility: { title: 'T', description: 'D' },
      semanticModel: { nodes: [], edges: [] }
    };
    
    const report = await loop.runReview(spec);
    
    expect(report.state).toBe(VisualReviewState.ACCEPTED);
    expect(report.findings.length).toBe(0);
    expect(report.budgetConsumed).toBe(1);
  });

  it('should patch a major geometric defect and then accept', async () => {
    const compiler = new VisualCompiler();
    const checker = new GeometricChecker();
    const reviewer = new MultimodalReviewer();
    const patcher = new PatchEngine();
    
    const loop = new VisualReviewLoop(compiler, checker, reviewer, patcher);
    
    const spec: VisualSpec = {
      schemaVersion: '1.0',
      visualId: 'fig-2',
      revision: 1,
      kind: VisualKind.concept_map,
      intent: { purpose: 'Test', required: true, requirementIds: [] },
      sourceRefs: [],
      provenance: 'test',
      presentation: { widthCssPx: 800, heightCssPx: 600 },
      accessibility: { title: 'T', description: 'D' },
      // The multimodal reviewer mock triggers on this flag
      semanticModel: { nodes: [], edges: [], _simulateOverlapError: true }
    };
    
    const report = await loop.runReview(spec);
    
    // Iteration 1: Overlap error -> Patch applied -> loop continues
    // Iteration 2: No errors (flag was cleared by the mock) -> Accepted
    expect(report.state).toBe(VisualReviewState.ACCEPTED);
    expect(report.appliedPatches.length).toBe(1);
    expect(report.appliedPatches[0].operation).toBe('moveLabel');
    expect(report.budgetConsumed).toBe(2);
    expect(spec.revision).toBe(2);
  });

  it('should stop and require review on a critical scientific error', async () => {
    const compiler = new VisualCompiler();
    const checker = new GeometricChecker();
    const reviewer = new MultimodalReviewer();
    const patcher = new PatchEngine();
    
    const loop = new VisualReviewLoop(compiler, checker, reviewer, patcher);
    
    const spec: VisualSpec = {
      schemaVersion: '1.0',
      visualId: 'fig-3',
      revision: 1,
      kind: VisualKind.concept_map,
      intent: { purpose: 'Test', required: true, requirementIds: [] },
      sourceRefs: [],
      provenance: 'test',
      presentation: { widthCssPx: 800, heightCssPx: 600 },
      accessibility: { title: 'T', description: 'D' },
      // Critical error will cause immediate stop
      semanticModel: { nodes: [], edges: [], _simulateCriticalError: true }
    };
    
    const report = await loop.runReview(spec);
    
    expect(report.state).toBe(VisualReviewState.NEEDS_REVIEW);
    expect(report.findings[0].severity).toBe('critical');
    expect(report.budgetConsumed).toBe(1); // Fails on first iter
  });
});
