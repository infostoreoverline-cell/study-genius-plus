import { describe, it, expect } from "vitest";
import { BenchmarkRunner } from "../src/benchmark.js";
import { CATALOG, calculateCostMicroEur } from "../src/pricing.js";

describe("Evaluation & Pricing Engine", () => {
  it("calculates cost correctly for Gemini 3.5 Flash-Lite", () => {
    // 200k input, 60k output, Gemini 3.5 Flash-Lite
    // 0.2 * 0.30 + 0.06 * 2.50 = 0.210 USD
    // 0.210 * 0.90 = 0.189 EUR = 189000 microEUR
    const snap = CATALOG[0];
    const cost = calculateCostMicroEur(snap, 200_000, 60_000);
    expect(cost).toBe(189_000);
  });

  it("calculates cost correctly for DeepSeek Flash", () => {
    // 120k input, 25k output, DeepSeek Flash (piena)
    // 0.12 * 2.00 + 0.025 * 8.00 = 0.44 CNY
    // 0.44 * 0.15 = 0.066 EUR = 66000 microEUR
    const snap = CATALOG.find(s => s.model === "DeepSeek Flash")!;
    const cost = calculateCostMicroEur(snap, 120_000, 25_000);
    expect(cost).toBe(66_000);
  });

  it("runs a benchmark and computes scores", async () => {
    const runner = new BenchmarkRunner();
    runner.addSample({
      id: "F05",
      topic: "Fisica",
      difficulty: 3,
      prompt: "Gauss con densità di carica...",
      expectedOutput: "Integrali e limiti"
    });

    const results = await runner.runEval("Gemini 3.5 Flash-Lite", "economy", (s) => {
      return {
        score: 4,
        criticalErrors: false,
        usage: { promptTokens: 200_000, completionTokens: 60_000, totalTokens: 260_000 }
      };
    });

    expect(results.length).toBe(1);
    expect(results[0].costMicroEur).toBe(189_000);
    expect(results[0].score).toBe(4);
    expect(results[0].criticalErrors).toBe(false);
  });
});
