import { create, all } from 'mathjs';

const math = create(all, {});

// Remove dangerous functions
// We want to keep only safe math operations.
// Mathjs evaluates expressions in a safe context by default, but we can further restrict it.
// According to docs, we can import only the needed functions, or we can use `math.evaluate`
// and ensure we don't pass a scope with global access.
// We should also restrict assignments.
const safeMath = create(all, {});
safeMath.import({
  'import': function () { throw new Error('Function import is disabled'); },
  'createUnit': function () { throw new Error('Function createUnit is disabled'); },
  'evaluate': function () { throw new Error('Function evaluate is disabled'); },
  'simplify': function () { throw new Error('Function simplify is disabled'); },
  'derivative': function () { throw new Error('Function derivative is disabled'); }
}, { override: true });

export class SafeMathEvaluator {
  /**
   * Generates Y values for a given expression and X domain, excluding specific points.
   */
  public generateSamples(
    expression: string,
    domain: [number, number],
    parameters: Record<string, number>,
    excludedPoints: number[] = [],
    samplesCount: number = 300
  ): { x: number; y: number | null }[] {
    const [min, max] = domain;
    if (min >= max) {
      throw new Error('Invalid domain: min must be less than max');
    }

    const step = (max - min) / (samplesCount - 1);
    const results: { x: number; y: number | null }[] = [];

    // Pre-parse the expression to check for assignment
    const node = safeMath.parse!(expression);
    const hasAssignment = node.filter((n: any) => n.isAssignmentNode).length > 0;
    if (hasAssignment) {
      throw new Error('Assignments are not allowed');
    }

    const compiled = node.compile();

    for (let i = 0; i < samplesCount; i++) {
      const x = min + i * step;

      // Check if x is close to an excluded point
      const isExcluded = excludedPoints.some(ep => Math.abs(x - ep) < 1e-9);
      
      if (isExcluded) {
        results.push({ x, y: null });
        continue;
      }

      try {
        const scope = { ...parameters, x };
        const y = compiled.evaluate(scope);
        
        if (typeof y !== 'number' || !isFinite(y)) {
          results.push({ x, y: null });
        } else {
          results.push({ x, y });
        }
      } catch (err) {
        // If evaluation fails for a specific point, treat it as null
        results.push({ x, y: null });
      }
    }

    return results;
  }
}
