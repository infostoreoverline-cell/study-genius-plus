import { z } from 'zod';
import { ReportStatus } from './entities.js';

export const FindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
  code: z.string(),
  targetId: z.string(),
  evidenceRefs: z.array(z.string()),
  explanation: z.string(),
  suggestedAction: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const ReviewReportSchema = z.object({
  schemaVersion: z.string(),
  targetRevisionId: z.string().uuid(),
  targetHash: z.string(),
  checkType: z.enum(['scientific', 'layout', 'grammar', 'math']),
  status: ReportStatus,
  findings: z.array(FindingSchema),
});
export type ReviewReport = z.infer<typeof ReviewReportSchema>;
