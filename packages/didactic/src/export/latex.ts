import { DocumentAST, ExportResult, VirtualFile } from '../../../contracts/src/index.js';

export class LatexExporter {
  public export(doc: DocumentAST): ExportResult {
    let tex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{${this.escape(doc.title)}}
\\begin{document}
\\maketitle

`;

    for (const chapter of doc.chapters) {
      tex += `\\section{${this.escape(chapter.title)}}\n\n`;
      for (const node of chapter.content) {
        if (node.type === 'paragraph') {
          tex += `${this.escape((node as any).content)}\n\n`;
        } else if (node.type === 'formula') {
          const f = node as any;
          if (f.isBlock) {
            tex += `\\begin{equation*}\n${f.latex}\n\\end{equation*}\n\n`;
          } else {
            tex += `$${f.latex}$ `;
          }
        } else if (node.type === 'figure_ref') {
          const fig = node as any;
          tex += `\\begin{figure}[h]\n\\centering\n\\includegraphics{assets/${fig.figureId}.pdf}\n\\caption{${this.escape(fig.caption)}}\n\\end{figure}\n\n`;
        }
      }
    }

    tex += `\\end{document}\n`;

    return {
      success: true,
      format: 'latex',
      files: [{ filename: 'document.tex', content: tex }]
    };
  }

  private escape(text: string): string {
    // Basic LaTeX escape for demonstration
    return text
      .replace(/\\/g, '\\textbackslash ')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/~/g, '\\textasciitilde ')
      .replace(/\^/g, '\\textasciicircum ');
  }
}
