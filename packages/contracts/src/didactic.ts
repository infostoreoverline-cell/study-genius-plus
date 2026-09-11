export const DidacticMode = {
  RIASSUNTO: 'RIASSUNTO',
  COMPLETO: 'COMPLETO',
  TEORIA: 'TEORIA',
  ESERCIZI: 'ESERCIZI'
} as const;

export type DidacticMode = typeof DidacticMode[keyof typeof DidacticMode];

export interface SubjectProfile {
  id: string;
  name: string;
  focus: string; // descrittore dell'obiettivo principale (es. "dimostrazioni formali", "meccanismi di reazione")
  rules: string[]; // vincoli specifici (es. "includi unità di misura in ogni passaggio")
}

export interface GenerationRequirement {
  id: string;
  description: string;
  source: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedLevel: string;
  chapter: string;
  developmentCriteria: string; // criteri di sviluppo atteso (es. "Enunciato, condizioni, significato")
  completionEvidence: string; // evidenza di completamento (es. "Argomento esplicito con ipotesi")
  status: 'PENDING' | 'DEVELOPED' | 'EXCLUDED';
}

export interface StudyPlan {
  projectId: string;
  mode: DidacticMode;
  subjectId: string;
  chapters: string[];
  requirements: GenerationRequirement[];
  estimatedCostEurMicro: number;
}

export interface ValidationFinding {
  type: 'STRUCTURAL' | 'SCIENTIFIC' | 'DIDACTIC';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  blockId: string;
  evidence: string;
  explanation: string;
  proposedAction: string;
}
