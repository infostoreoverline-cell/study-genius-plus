import { VisualSpec, VisualReviewState, VisualRevisionReport, VisualFinding, VisualPatch } from 'contracts';
import { VisualCompiler } from '../compiler.js';
import { GeometricChecker } from './geometric_checker.js';
import { MultimodalReviewer } from './multimodal_reviewer.js';
import { PatchEngine } from './patch_engine.js';
import * as crypto from 'crypto';

export class VisualReviewLoop {
  private compiler: VisualCompiler;
  private geometricChecker: GeometricChecker;
  private multimodalReviewer: MultimodalReviewer;
  private patchEngine: PatchEngine;

  private readonly MAX_ITERATIONS = 5;

  constructor(
    compiler: VisualCompiler,
    geometricChecker: GeometricChecker,
    multimodalReviewer: MultimodalReviewer,
    patchEngine: PatchEngine
  ) {
    this.compiler = compiler;
    this.geometricChecker = geometricChecker;
    this.multimodalReviewer = multimodalReviewer;
    this.patchEngine = patchEngine;
  }

  private hashSpec(spec: VisualSpec): string {
    const data = JSON.stringify(spec.semanticModel) + JSON.stringify(spec.presentation);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public async runReview(spec: VisualSpec): Promise<VisualRevisionReport> {
    let iteration = 0;
    const seenHashes = new Set<string>();
    
    let state: VisualReviewState = VisualReviewState.SPEC_DRAFT;
    let currentFindings: VisualFinding[] = [];
    const allPatches: VisualPatch[] = [];
    
    while (iteration < this.MAX_ITERATIONS) {
      iteration++;
      const currentHash = this.hashSpec(spec);
      
      if (seenHashes.has(currentHash)) {
        // Anti-oscillation: we have been in this exact semantic state before.
        state = VisualReviewState.NEEDS_REVIEW;
        break;
      }
      seenHashes.add(currentHash);

      // 1. Compile
      const svg = this.compiler.compile(spec);
      state = VisualReviewState.COMPILED;

      // 2. Local Geometric Check
      const geomFindings = this.geometricChecker.check(spec, svg);
      state = VisualReviewState.LOCAL_CHECKED;

      // If critical local findings, stop and try to patch or reject
      const hasCriticalLocal = geomFindings.some(f => f.severity === 'critical');
      
      // 3. Multimodal Review
      let semanticFindings: VisualFinding[] = [];
      if (!hasCriticalLocal) {
        semanticFindings = await this.multimodalReviewer.review(spec, svg);
      }

      currentFindings = [...geomFindings, ...semanticFindings];
      const hasCritical = currentFindings.some(f => f.severity === 'critical');
      const hasMajor = currentFindings.some(f => f.severity === 'major');

      if (!hasCritical && !hasMajor) {
        // Passed all checks
        state = VisualReviewState.ACCEPTED;
        break;
      }

      if (hasCritical) {
        // Critical finding -> stop. Semantic critical findings require manual intervention
        // or a completely different layout/prompt, which is outside local patch scope.
        state = VisualReviewState.NEEDS_REVIEW;
        break;
      }

      // Try to patch
      const patchResult = this.patchEngine.applyPatches(spec, currentFindings);
      if (patchResult.patched) {
        allPatches.push(...patchResult.patches);
      } else {
        // Couldn't patch -> Needs manual review
        state = VisualReviewState.NEEDS_REVIEW;
        break;
      }
    }

    if (state !== VisualReviewState.ACCEPTED && state !== VisualReviewState.REJECTED) {
      state = VisualReviewState.NEEDS_REVIEW;
    }

    return {
      revisionNumber: spec.revision,
      specHash: this.hashSpec(spec),
      state,
      findings: currentFindings,
      appliedPatches: allPatches,
      budgetConsumed: iteration // M10 mock: 1 unit of budget per iteration
    };
  }
}
