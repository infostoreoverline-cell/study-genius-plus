import { VisualSpec, VisualFinding, VisualPatch, VisualPatchOperation } from 'contracts';

export class PatchEngine {
  /**
   * Evaluates findings and tries to apply deterministic patches to the spec.
   * Modifies the spec in place (or returns a cloned version).
   */
  public applyPatches(spec: VisualSpec, findings: VisualFinding[]): { patched: boolean, patches: VisualPatch[] } {
    const patches: VisualPatch[] = [];
    let patched = false;

    // A real implementation would apply specific geometric operations (e.g., moveLabel)
    // based on the targetIds. 
    for (const finding of findings) {
      if (finding.severity === 'critical') {
        // We cannot patch critical findings locally
        continue;
      }

      if (finding.suggestedAction === 'moveLabel') {
        // Mock application of a patch
        if (spec.semanticModel) {
          spec.semanticModel._patchedMoveLabel = true; 
        }
        
        patches.push({
          targetId: finding.targetIds[0] || 'unknown',
          operation: 'moveLabel',
          value: { dx: 10, dy: 10 },
          preconditionHash: spec.revision.toString(),
          reason: finding.explanation
        });
        patched = true;
      }
    }

    if (patched) {
      spec.revision += 1; // Increment revision due to patch
    }

    return { patched, patches };
  }
}
