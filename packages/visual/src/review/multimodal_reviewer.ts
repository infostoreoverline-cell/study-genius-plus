import { VisualSpec, VisualFinding } from 'contracts';

export class MultimodalReviewer {
  /**
   * Simulates a multimodal review via AI Gateway.
   */
  public async review(spec: VisualSpec, svg: string): Promise<VisualFinding[]> {
    const findings: VisualFinding[] = [];
    
    // In a real implementation this would invoke the AI with the SVG / Raster.
    // For M10, we will just return mock findings based on the spec to test the loop.
    
    if (spec.semanticModel && (spec.semanticModel as any)._simulateOverlapError) {
      findings.push({
        id: `ai-${Date.now()}-1`,
        severity: 'major',
        code: 'LABEL_OVERLAP',
        targetIds: ['node-1'],
        explanation: 'La parola si sovrappone alla linea.',
        suggestedAction: 'moveLabel'
      });
      // Clear the simulation flag so it doesn't loop infinitely if patched
      delete (spec.semanticModel as any)._simulateOverlapError;
    }
    
    if (spec.semanticModel && (spec.semanticModel as any)._simulateCriticalError) {
      findings.push({
        id: `ai-${Date.now()}-2`,
        severity: 'critical',
        code: 'SCIENTIFIC_ERROR',
        targetIds: ['formula'],
        explanation: 'La formula è scientificamente scorretta.',
      });
      // A critical finding won't be patched by the PatchEngine locally in M10, it causes rejection.
    }

    return findings;
  }
}
