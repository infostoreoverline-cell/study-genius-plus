import { VisualSpec, VisualKind } from 'contracts';

export class LegacyImporter {
  /**
   * Converts a legacy visual block to the new VisualSpec contract.
   * Validates structure and returns undefined or throws if ambiguous.
   */
  public importBlock(legacyData: any): VisualSpec {
    if (!legacyData || typeof legacyData !== 'object') {
      throw new Error('Invalid legacy data');
    }

    const { type, content, id } = legacyData;
    
    // Very basic mapping for demonstration
    let kind: VisualKind;
    let semanticModel: any = {};

    switch (type) {
      case 'json:plot':
        kind = VisualKind.function_plot;
        semanticModel = {
          x: { symbol: 'x', unit: '1', domain: [0, 10] },
          y: { symbol: 'y', unit: '1' },
          series: [
            { id: 'legacy-s1', expression: content?.formula || 'x', parameters: {} }
          ],
          assumptions: []
        };
        break;
      case 'json:graph':
        kind = VisualKind.concept_map;
        semanticModel = {
          nodes: content?.nodes || [],
          edges: content?.edges || []
        };
        break;
      case 'visual-spec':
        // Direct mapping attempt if already somewhat close
        if (Object.values(VisualKind).includes(content?.kind)) {
          kind = content.kind as VisualKind;
          semanticModel = content.semanticModel || {};
        } else {
          throw new Error(`Ambiguous visual-spec kind: ${content?.kind}`);
        }
        break;
      default:
        throw new Error(`Unsupported legacy visual type: ${type}`);
    }

    return {
      schemaVersion: '1.0',
      visualId: id || `legacy-${Date.now()}`,
      revision: 1,
      kind,
      intent: { purpose: 'Legacy Import', required: false, requirementIds: [] },
      sourceRefs: [],
      provenance: 'legacy_import',
      presentation: { widthCssPx: 500, heightCssPx: 400 },
      accessibility: { title: 'Imported Figure', description: 'Legacy content' },
      semanticModel
    };
  }
}
