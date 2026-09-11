import { DocumentAST } from './document.js';

export type ExportFormat = 'markdown_zip' | 'latex' | 'pdf';

export interface ExportRequest {
  documentId: string;
  revisionId: string;
  format: ExportFormat;
  includeAssets: boolean;
}

export interface VirtualFile {
  filename: string;
  content: string; // or Buffer, but we stick to string for mock/text
  isBinary?: boolean;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  files: VirtualFile[];
  errors?: string[];
}

export interface PdfQaFinding {
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  issue: string; // e.g. "overflow", "unresolved_formula", "empty_page"
}

export interface PdfQaResult {
  passed: boolean;
  findings: PdfQaFinding[];
}
