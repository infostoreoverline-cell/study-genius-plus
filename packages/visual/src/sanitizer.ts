export class SvgSanitizer {
  /**
   * Basic sanitizer to ensure there are no script tags or on* attributes.
   * Also prefixes all ids with visualId to prevent collisions.
   */
  public sanitize(svgString: string, visualId: string): string {
    // 1. Forbid scripts
    if (/<script\b/i.test(svgString)) {
      throw new Error('Script tags are not allowed in SVG');
    }
    
    // 2. Forbid on* event handlers (basic regex check)
    if (/\bon[a-z]+\s*=/i.test(svgString)) {
      throw new Error('Event handlers (on*) are not allowed in SVG');
    }

    // 3. Prefix ids to avoid document-wide collisions
    // Find all id="..." and prefix them
    let sanitized = svgString.replace(/id="([^"]+)"/g, `id="${visualId}-$1"`);
    
    // Update url(#id) references
    sanitized = sanitized.replace(/url\(#([^)]+)\)/g, `url(#${visualId}-$1)`);

    return sanitized;
  }
}
