import { DocumentAST, SymbolDefinition, FormulaNode, ChapterNode } from '../../contracts/src/index.js';

export interface SymbolConflict {
  symbol: string;
  meanings: string[];
  nodeIds: string[];
}

export class SymbolRegistry {
  private symbols: Map<string, SymbolDefinition[]> = new Map();

  constructor() {}

  public processDocument(document: DocumentAST): SymbolConflict[] {
    this.symbols.clear();
    const conflicts: SymbolConflict[] = [];

    // Traverse AST to collect symbols
    for (const chapter of document.chapters) {
      this.collectFromChapter(chapter);
    }

    // Check for conflicts
    for (const [symbol, definitions] of this.symbols.entries()) {
      if (definitions.length > 1) {
        const meanings = new Set(definitions.map(d => d.meaning));
        if (meanings.size > 1) {
          conflicts.push({
            symbol,
            meanings: Array.from(meanings),
            nodeIds: definitions.map(d => d.nodeId)
          });
        }
      }
    }

    return conflicts;
  }

  private collectFromChapter(chapter: ChapterNode) {
    for (const node of chapter.content) {
      if (node.type === 'formula') {
        const formula = node as FormulaNode;
        for (const sym of formula.symbols) {
          if (!this.symbols.has(sym.symbol)) {
            this.symbols.set(sym.symbol, []);
          }
          this.symbols.get(sym.symbol)!.push(sym);
        }
      }
    }
  }
}
