export const VisualReviewState = {
  SPEC_DRAFT: 'SPEC_DRAFT',
  COMPILED: 'COMPILED',
  LOCAL_CHECKED: 'LOCAL_CHECKED',
  REVIEWED: 'REVIEWED',
  ACCEPTED: 'ACCEPTED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  REJECTED: 'REJECTED'
} as const;

export type VisualReviewState = typeof VisualReviewState[keyof typeof VisualReviewState];

export type FindingSeverity = 'minor' | 'major' | 'critical';

export interface VisualFinding {
  id: string;
  severity: FindingSeverity;
  code: string;
  targetIds: string[];
  explanation: string;
  suggestedAction?: string;
  evidenceRefs?: string[];
}

export type VisualPatchOperation = 'moveLabel' | 'resizeNode' | 'increasePadding' | 'rerouteEdge' | 'changeOrientation' | 'splitPanel' | 'adjustLegend' | 'expandCanvas';

export interface VisualPatch {
  targetId: string;
  operation: VisualPatchOperation;
  value: any;
  preconditionHash: string;
  reason: string;
}

export interface VisualRevisionReport {
  revisionNumber: number;
  specHash: string;
  layoutHash?: string;
  state: VisualReviewState;
  findings: VisualFinding[];
  appliedPatches: VisualPatch[];
  budgetConsumed: number;
  reviewedAt?: string;
}
