export interface PricingSnapshot {
  provider: string;
  model: string;
  currency: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  validFrom: string;
  validUntil: string | null;
  eurConversionRate: number;
}

export const CATALOG: PricingSnapshot[] = [
  {
    provider: "Google",
    model: "Gemini 3.5 Flash-Lite",
    currency: "USD",
    inputCostPerMillion: 0.30,
    outputCostPerMillion: 2.50,
    validFrom: "2026-09-11",
    validUntil: null,
    eurConversionRate: 0.90
  },
  {
    provider: "Google",
    model: "Gemini 3.8 Flash",
    currency: "USD",
    inputCostPerMillion: 0.75,
    outputCostPerMillion: 3.75,
    validFrom: "2026-09-11",
    validUntil: "2026-12-31",
    eurConversionRate: 0.90
  },
  {
    provider: "Google",
    model: "Gemini 3.8 Flash (2027)",
    currency: "USD",
    inputCostPerMillion: 1.50,
    outputCostPerMillion: 7.50,
    validFrom: "2027-01-01",
    validUntil: null,
    eurConversionRate: 0.90
  },
  {
    provider: "DeepSeek",
    model: "DeepSeek Flash", // Fascia piena
    currency: "CNY",
    inputCostPerMillion: 2.00,
    outputCostPerMillion: 8.00,
    validFrom: "2026-09-11",
    validUntil: null,
    eurConversionRate: 0.15
  },
  {
    provider: "DeepSeek",
    model: "DeepSeek Flash (Ridotta)", // Fascia ridotta
    currency: "CNY",
    inputCostPerMillion: 1.00,
    outputCostPerMillion: 4.00,
    validFrom: "2026-09-11",
    validUntil: null,
    eurConversionRate: 0.15
  }
];

export function calculateCostMicroEur(snapshot: PricingSnapshot, inputTokens: number, outputTokens: number): number {
  const costInCurrency = (inputTokens / 1_000_000) * snapshot.inputCostPerMillion + 
                         (outputTokens / 1_000_000) * snapshot.outputCostPerMillion;
  const costInEur = costInCurrency * snapshot.eurConversionRate;
  return Math.round(costInEur * 1_000_000);
}
