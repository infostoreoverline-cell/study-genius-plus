import { z } from 'zod';
import { uuidSchema } from './entities.js';

export const GenerationRequestSchema = z.object({
  schemaVersion: z.string(),
  projectId: uuidSchema,
  sourceSelectionRevisionId: uuidSchema,
  subjectProfileRevisionId: uuidSchema,
  mode: z.enum(['summary', 'complete', 'theory', 'exercises']),
  scope: z.object({
    requestedTopics: z.array(z.string()),
    includePrerequisites: z.boolean(),
    sourcePolicy: z.enum(['grounded_with_labeled_extensions', 'strict', 'expanded']),
  }),
  student: z.object({
    level: z.enum(['university', 'high_school', 'middle_school']),
    examFormat: z.enum(['written_and_oral', 'written', 'oral']),
    mathDetail: z.enum(['explicit', 'minimal', 'advanced']),
    studyTimeMinutes: z.number().nullable(),
  }),
  output: z.object({
    language: z.string(),
    selfContained: z.boolean(),
    visualQuality: z.enum(['standard', 'high', 'minimal']),
    formats: z.array(z.string()),
  }),
  economy: z.object({
    capEurMicro: z.number().int().nonnegative(),
    policy: z.enum(['economical_quality', 'best_quality', 'fastest']),
  }),
  customInstructions: z.string().optional(),
});
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
