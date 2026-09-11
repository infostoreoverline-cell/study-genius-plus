import { ChapterNode, DocumentAST, SymbolDefinition } from '../../contracts/src/index.js';

export class DocumentAssembler {
  constructor() {}

  public assemble(title: string, chapters: ChapterNode[]): DocumentAST {
    const symbols: SymbolDefinition[] = [];
    
    // Resolve figures numbering
    let figureCounter = 1;

    for (const chapter of chapters) {
      for (const node of chapter.content) {
        if (node.type === 'figure_ref') {
          // Here we would typically replace a placeholder or just update the caption
          // if it contained an automated counter. For simplicity, we just keep the node.
          // Realistically, the caption might be "Figura {n}: ...".
          if (node.caption.includes('Figura X')) {
            node.caption = node.caption.replace('Figura X', `Figura ${figureCounter}`);
          }
          figureCounter++;
        }
        
        if (node.type === 'formula') {
          symbols.push(...node.symbols);
        }
      }
    }

    return {
      id: `doc_${Date.now()}`,
      type: 'document',
      hash: this.calculateHash(title, chapters),
      sourceRefs: [],
      title,
      chapters,
      symbols
    };
  }

  private calculateHash(title: string, chapters: ChapterNode[]): string {
    // Mock hash calculation based on child hashes
    const chapterHashes = chapters.map(c => c.hash).join('-');
    return `hash_${title}_${chapterHashes}`;
  }
}
