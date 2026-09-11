import { VisualSpec, VisualFinding } from 'contracts';

export class GeometricChecker {
  /**
   * Performs basic heuristic checks on the SVG string for bounding box issues.
   * Note: In a real implementation this might use a headless browser or node-canvas
   * to get real text metrics. Here we use basic regex or simple logic for M10 demonstration.
   */
  public check(spec: VisualSpec, svg: string): VisualFinding[] {
    const findings: VisualFinding[] = [];
    
    // Check 1: Does the SVG exist and have dimensions?
    if (!svg || !svg.includes('<svg')) {
      findings.push({
        id: `geom-${Date.now()}-1`,
        severity: 'critical',
        code: 'INVALID_SVG',
        targetIds: ['svg'],
        explanation: 'The SVG output is missing or empty.',
      });
      return findings;
    }

    // Heuristic: Ensure no obvious negative coordinates on main viewBox
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(' ').map(Number);
      if (parts.length === 4 && (parts[2] <= 0 || parts[3] <= 0)) {
        findings.push({
          id: `geom-${Date.now()}-2`,
          severity: 'major',
          code: 'INVALID_VIEWBOX',
          targetIds: ['svg'],
          explanation: 'The viewBox has invalid dimensions.',
        });
      }
    }

    // Heuristic: Text labels should not have x or y out of basic bounds 
    // Very rudimentary check
    const textMatches = svg.match(/<text[^>]*x="(-?\d+(\.\d+)?)"[^>]*y="(-?\d+(\.\d+)?)"[^>]*>/g);
    if (textMatches) {
      for (const t of textMatches) {
        const xMatch = t.match(/x="(-?\d+(\.\d+)?)"/);
        const yMatch = t.match(/y="(-?\d+(\.\d+)?)"/);
        
        if (xMatch && yMatch) {
          const x = parseFloat(xMatch[1]);
          const y = parseFloat(yMatch[1]);
          if (x < -100 || y < -100 || x > spec.presentation.widthCssPx + 100 || y > spec.presentation.heightCssPx + 100) {
            findings.push({
              id: `geom-${Date.now()}-3`,
              severity: 'major',
              code: 'LABEL_OUT_OF_BOUNDS',
              targetIds: ['text'],
              explanation: `Label detected out of bounds at (${x}, ${y}).`,
              suggestedAction: 'moveLabel'
            });
            break; // Just report one for now
          }
        }
      }
    }

    return findings;
  }
}
