import type { AiRequest, AiResult, ProviderAdapter } from '../../../contracts/src/providers.js';

export class DeepSeekAdapter implements ProviderAdapter {
  async execute(req: AiRequest, secret: string): Promise<AiResult> {
    const messages = [];

    if (req.systemInstruction) {
      messages.push({ role: 'system', content: req.systemInstruction });
    }

    const userContent = req.input.map(part => {
      if (part.text) {
        return { type: 'text', text: part.text };
      } else if (part.image) {
        return {
          type: 'image_url',
          image_url: { url: `data:${part.image.mimeType};base64,${part.image.data}` }
        };
      }
      return { type: 'text', text: '' };
    });

    messages.push({ role: 'user', content: userContent });

    const payload: any = {
      model: req.modelId,
      messages,
      max_tokens: req.outputTokenLimit
    };

    if (req.responseSchemaId) {
      payload.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), req.deadlineMs || 120000);

    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DeepSeek API error: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      
      const finishReasonMap: Record<string, any> = {
        'stop': 'complete',
        'length': 'length',
        'content_filter': 'blocked',
        'tool_calls': 'tool_call'
      };

      const choice = data.choices?.[0];
      const finishReason = choice ? finishReasonMap[choice.finish_reason] || 'unknown' : 'unknown';

      return {
        providerRequestId: data.id || null,
        requestedModelId: req.modelId,
        reportedModelId: data.model || req.modelId,
        output: choice?.message?.content ? [{ text: choice.message.content }] : [],
        finishReason,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
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
