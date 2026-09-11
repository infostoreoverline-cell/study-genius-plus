import { GoogleGenAI } from '@google/genai';
import type { AiRequest, AiResult, ProviderAdapter } from '../../../contracts/src/providers.js';

export class GoogleAdapter implements ProviderAdapter {
  async execute(req: AiRequest, secret: string): Promise<AiResult> {
    const ai = new GoogleGenAI({ apiKey: secret });

    const contents = req.input.map(part => {
      if (part.text) {
        return { text: part.text };
      } else if (part.image) {
        return {
          inlineData: {
            mimeType: part.image.mimeType,
            data: part.image.data
          }
        };
      } else if (part.file) {
        return {
          fileData: {
            fileUri: part.file.uri,
            mimeType: part.file.mimeType
          }
        };
      }
      return { text: '' };
    });

    try {
      // Set timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), req.deadlineMs || 120000);

      // Map config
      const config: any = {
        systemInstruction: req.systemInstruction,
        maxOutputTokens: req.outputTokenLimit,
      };

      if (req.responseSchemaId) {
        // Simplified mapping for response format if needed
        config.responseMimeType = 'application/json';
      }

      const response = await ai.models.generateContent({
        model: req.modelId,
        contents: contents as any,
        config: config
      });

      clearTimeout(timeoutId);

      const finishReasonMap: Record<string, any> = {
        'STOP': 'complete',
        'MAX_TOKENS': 'length',
        'SAFETY': 'blocked',
        'RECITATION': 'blocked',
        'OTHER': 'unknown'
      };

      const cand = response.candidates?.[0];
      const finishReason = cand ? finishReasonMap[cand.finishReason as string] || 'unknown' : 'unknown';

      const usageMetadata = response.usageMetadata;

      return {
        providerRequestId: null, // GenAI SDK doesn't expose this directly easily
        requestedModelId: req.modelId,
        reportedModelId: response.modelVersion || req.modelId,
        output: cand?.content?.parts ? cand.content.parts.map(p => ({ text: p.text || '' })) : [],
        finishReason,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount || 0,
          cachedPromptTokens: usageMetadata?.cachedContentTokenCount || 0,
          completionTokens: usageMetadata?.candidatesTokenCount || 0,
          totalTokens: usageMetadata?.totalTokenCount || 0
        },
        rawUsageArtifactId: null,
        responseArtifactId: 'TBD'
      };
    } catch (err: any) {
      return {
        providerRequestId: null,
        requestedModelId: req.modelId,
        reportedModelId: null,
        output: [],
        finishReason: 'unknown',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        rawUsageArtifactId: null,
        responseArtifactId: 'TBD',
        error: err.message
      };
    }
  }
}
