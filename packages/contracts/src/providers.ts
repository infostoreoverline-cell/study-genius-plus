export type AiRole =
  | "SOURCE_READING" | "PLANNING" | "WRITING"
  | "SCIENTIFIC_REVIEW" | "VISUAL_REVIEW" | "REPAIR"
  | "UTILITY";

export interface InputPart {
  text?: string;
  image?: {
    mimeType: string;
    data: string; // base64
  };
  file?: {
    uri: string;
    mimeType: string;
  };
}

export interface OutputPart {
  text: string;
}

export interface NormalizedUsage {
  promptTokens: number;
  cachedPromptTokens?: number;
  completionTokens: number;
  reasoningTokens?: number;
  totalTokens: number;
}

export interface AiRequest {
  requestId: string;
  jobId: string | null;
  taskId: string | null;
  budgetAccountId: string;
  role: AiRole;
  accountId: string;
  modelId: string;
  systemInstruction: string;
  input: readonly InputPart[];
  responseSchemaId: string | null;
  outputTokenLimit: number;
  pricingProfile: "economy" | "balanced" | "quality";
  deadlineMs: number;
  contextManifestId: string;
}

export interface AiResult {
  providerRequestId: string | null;
  requestedModelId: string;
  reportedModelId: string | null;
  output: readonly OutputPart[];
  finishReason: "complete" | "length" | "blocked" | "tool_call" | "unknown";
  usage: NormalizedUsage;
  rawUsageArtifactId: string | null;
  responseArtifactId: string;
  error?: string;
}

export interface ProviderAdapter {
  execute(req: AiRequest, secret: string): Promise<AiResult>;
}
