import { VisualSpec } from 'contracts';
import { VisualRegistry } from './registry.js';
import { SvgSanitizer } from './sanitizer.js';

export class VisualCompiler {
  private registry: VisualRegistry;
  private sanitizer: SvgSanitizer;

  constructor() {
    this.registry = new VisualRegistry();
    this.sanitizer = new SvgSanitizer();
  }

  public compile(spec: VisualSpec): string {
    const renderer = this.registry.getRenderer(spec.kind);
    if (!renderer) {
      throw new Error(`UNSUPPORTED_VISUAL_KIND: ${spec.kind}`);
    }

    const rawSvg = renderer.render(spec);
    return this.sanitizer.sanitize(rawSvg, spec.visualId);
  }
}
