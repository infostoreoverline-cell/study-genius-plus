import { DocumentRevision, DocumentAST, ASTNode, DocumentContentNode, ChapterNode } from '../../contracts/src/index.js';

export interface PatchAction {
  nodeId: string;
  payload: Partial<DocumentContentNode> | Partial<ChapterNode> | Partial<DocumentAST>;
}

export class DocumentEditor {
  private currentRevisionId: string | null = null;
  private history: Map<string, DocumentRevision> = new Map();

  constructor() {}

  public loadRevision(revision: DocumentRevision) {
    this.history.set(revision.revisionId, revision);
    this.currentRevisionId = revision.revisionId;
  }

  public getCurrentRevision(): DocumentRevision {
    if (!this.currentRevisionId) {
      throw new Error('No revision loaded');
    }
    return this.history.get(this.currentRevisionId)!;
  }

  public applyPatch(expectedRevisionId: string, patch: PatchAction): DocumentRevision {
    if (this.currentRevisionId !== expectedRevisionId) {
      throw new Error('Conflict: The document has been modified in another session or tab.');
    }

    const currentRev = this.getCurrentRevision();
    
    // Deep clone AST to apply patch immutably
    const newAst = JSON.parse(JSON.stringify(currentRev.ast)) as DocumentAST;

    let modified = false;

    // Apply patch
    if (newAst.id === patch.nodeId) {
      Object.assign(newAst, patch.payload);
      newAst.hash = `hash_${Date.now()}`;
      modified = true;
    } else {
      for (const chapter of newAst.chapters) {
        if (chapter.id === patch.nodeId) {
          Object.assign(chapter, patch.payload);
          chapter.hash = `hash_${Date.now()}`;
          modified = true;
          break;
        }

        for (let i = 0; i < chapter.content.length; i++) {
          const node = chapter.content[i];
          if (node.id === patch.nodeId) {
            Object.assign(node, patch.payload);
            node.hash = `hash_${Date.now()}`;
            modified = true;

            // Invalidation logic: if a formula changes, the subsequent figure refs might need review
            if (node.type === 'formula') {
              this.invalidateDependentFigures(chapter.content, i);
            }
            break;
          }
        }
        if (modified) break;
      }
    }

    if (!modified) {
      throw new Error(`Node ${patch.nodeId} not found`);
    }

    // Cost is zero if we just change a title, or we can charge a flat rate for targeted regeneration
    const newCost = patch.payload.type === undefined ? 0 : 0.05; // mock cost

    const newRevision: DocumentRevision = {
      revisionId: `rev_${Date.now()}`,
      documentId: currentRev.documentId,
      timestamp: new Date(),
      ast: newAst,
      cost: currentRev.cost + newCost
    };

    this.history.set(newRevision.revisionId, newRevision);
    this.currentRevisionId = newRevision.revisionId;
    return newRevision;
  }

  private invalidateDependentFigures(content: DocumentContentNode[], formulaIndex: number) {
    // If a formula changes, we invalidate the very next figure ref as a simplified heuristic
    for (let j = formulaIndex + 1; j < content.length; j++) {
      if (content[j].type === 'figure_ref') {
        const figRef = content[j] as any;
        figRef.needsReview = true; // Injecting needsReview flag
        figRef.hash = `invalidated_${Date.now()}`;
        break;
      }
    }
  }

  public restoreRevision(revisionId: string): DocumentRevision {
    if (!this.history.has(revisionId)) {
      throw new Error(`Revision ${revisionId} not found`);
    }
    this.currentRevisionId = revisionId;
    return this.history.get(revisionId)!;
  }
}
