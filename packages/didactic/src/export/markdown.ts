import { DocumentAST, ExportResult, VirtualFile } from '../../../contracts/src/index.js';

export class MarkdownExporter {
  public export(doc: DocumentAST): ExportResult {
    const files: VirtualFile[] = [];

    // 1. document.md
    let mdContent = `# ${doc.title}\n\n`;
    for (const chapter of doc.chapters) {
      mdContent += `## ${chapter.title}\n\n`;
      for (const node of chapter.content) {
        if (node.type === 'paragraph') {
          mdContent += `${(node as any).content}\n\n`;
        } else if (node.type === 'formula') {
          const f = node as any;
          if (f.isBlock) {
            mdContent += `$$ ${f.latex} $$\n\n`;
          } else {
            mdContent += `$${f.latex}$ `;
          }
        } else if (node.type === 'figure_ref') {
          const fig = node as any;
          mdContent += `![${fig.caption}](assets/${fig.figureId}.svg)\n\n`;
        }
      }
    }
    files.push({ filename: 'document.md', content: mdContent });

    // 2. fonti.md
    files.push({ filename: 'fonti.md', content: '# Fonti\n\n- Nessuna fonte esterna dichiarata.' });

    // 3. verifiche.md
    files.push({ filename: 'verifiche.md', content: '# Verifiche\n\nNessuna questione aperta.' });

    // 4. LEGGIMI.md
    files.push({ filename: 'LEGGIMI.md', content: 'Apri document.md in un lettore Markdown con supporto LaTeX (es. Obsidian o VSCode con estensione Math).' });

    // 5. manifest.json
    files.push({
      filename: 'manifest.json',
      content: JSON.stringify({
        id: doc.id,
        title: doc.title,
        hash: doc.hash,
        timestamp: new Date().toISOString()
      }, null, 2)
    });

    return {
      success: true,
      format: 'markdown_zip',
      files
    };
  }
}
