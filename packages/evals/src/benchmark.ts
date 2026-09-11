import { calculateCostMicroEur, CATALOG } from "./pricing.js";
import type { AiRequest, AiResult, NormalizedUsage } from "contracts/providers";

export interface BenchmarkSample {
  id: string;
  topic: string;
  difficulty: number; // 1-5
  prompt: string;
  expectedOutput: string;
}

export interface EvalResult {
  sampleId: string;
  model: string;
  score: number; // 0-4
  criticalErrors: boolean;
  costMicroEur: number;
  timeMs: number;
}

export class BenchmarkRunner {
  private samples: BenchmarkSample[] = [];

  addSample(sample: BenchmarkSample) {
    this.samples.push(sample);
  }

  async runEval(model: string, profile: "economy" | "balanced" | "quality", mockResult: (sample: BenchmarkSample) => Partial<AiResult> & { score: number, criticalErrors: boolean, usage?: NormalizedUsage }): Promise<EvalResult[]> {
    const snapshot = CATALOG.find(c => c.model === model);
    if (!snapshot) throw new Error(`Model ${model} not found in catalog`);

    const results: EvalResult[] = [];
    
    for (const sample of this.samples) {
      const start = Date.now();
      
      // Simulating a call to the provider
      const mocked = mockResult(sample);
      const usage = mocked.usage || { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 };
      
      const timeMs = Date.now() - start + 1500; // Simulated delay
      const costMicroEur = calculateCostMicroEur(snapshot, usage.promptTokens, usage.completionTokens);

      results.push({
        sampleId: sample.id,
        model,
        score: mocked.score,
        criticalErrors: mocked.criticalErrors,
        costMicroEur,
        timeMs
      });
    }

    return results;
  }
}
