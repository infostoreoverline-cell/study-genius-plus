export type NodeType = 
  | 'document'
  | 'chapter'
  | 'paragraph'
  | 'formula'
  | 'figure_ref'
  | 'list'
  | 'citation';

export interface ASTNode {
  id: string;
  type: NodeType;
  hash: string;
  sourceRefs: string[];
}

export interface SymbolDefinition {
  symbol: string;
  meaning: string;
  nodeId: string;
}

export interface ParagraphNode extends ASTNode {
  type: 'paragraph';
  content: string;
}

export interface FormulaNode extends ASTNode {
  type: 'formula';
  latex: string;
  isBlock: boolean;
  symbols: SymbolDefinition[];
}

export interface FigureRefNode extends ASTNode {
  type: 'figure_ref';
  figureId: string;
  caption: string;
}

export interface ListDefinitionNode extends ASTNode {
  type: 'list';
  items: string[];
}

export interface CitationNode extends ASTNode {
  type: 'citation';
  sourceId: string;
}

export type DocumentContentNode = ParagraphNode | FormulaNode | FigureRefNode | ListDefinitionNode | CitationNode;

export interface ChapterNode extends ASTNode {
  type: 'chapter';
  title: string;
  content: DocumentContentNode[];
}

export interface DocumentAST extends ASTNode {
  type: 'document';
  title: string;
  chapters: ChapterNode[];
  symbols: SymbolDefinition[];
}

export interface DocumentRevision {
  revisionId: string;
  documentId: string;
  timestamp: Date;
  ast: DocumentAST;
  cost: number;
}
