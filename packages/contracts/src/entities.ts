import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const hashSchema = z.string(); // e.g. sha256 hex
export const timestampSchema = z.string().datetime();

export const BaseEntitySchema = z.object({
  id: uuidSchema,
  schemaVersion: z.string(),
});

// Enums
export const TaskState = z.enum(['BLOCKED', 'READY', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED']);
export const ExtractionStatus = z.enum(['pending', 'extracted', 'needs_review', 'failed']);
export const ChapterStatus = z.enum(['draft', 'needs_review', 'ready']);
export const ArtifactStatus = z.enum(['pending', 'ready', 'failed']);
export const ExportStatus = z.enum(['pending', 'running', 'ready', 'failed']);
export const VisualRevisionState = z.enum(['SPEC_DRAFT', 'COMPILED', 'LOCAL_CHECKED', 'REVIEWED', 'PATCHING', 'ACCEPTED', 'NEEDS_REVIEW', 'REJECTED']);
export const ReportStatus = z.enum(['passed', 'failed', 'needs_review', 'unverified']);
export const BackupStatus = z.enum(['IN_PROGRESS', 'VERIFIED', 'FAILED']);

// Domain entities
export const ProjectSchema = BaseEntitySchema.extend({
  title: z.string(),
  subjectProfileId: uuidSchema,
  createdAt: timestampSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

export const BboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const SourceUnitSchema = BaseEntitySchema.extend({
  documentId: uuidSchema,
  pageIndex: z.number().int().nonnegative(),
  printedPageLabel: z.string().optional(),
  kind: z.enum(['formula', 'table', 'exercise', 'figure', 'text']),
  bbox: BboxSchema.optional(),
  hash: hashSchema,
  extractionStatus: ExtractionStatus,
  text: z.string().optional(),
});
export type SourceUnit = z.infer<typeof SourceUnitSchema>;

export const DocumentSchema = BaseEntitySchema.extend({
  originalName: z.string(),
  mediaType: z.string(),
  blobHash: hashSchema,
  byteSize: z.number().int().nonnegative(),
});
export type Document = z.infer<typeof DocumentSchema>;
