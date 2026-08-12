import type { Fundamentals, PriceData, FactorScores } from "../types.js";
import { STRATEGY } from "../config/strategy.js";
import { calculateValueScores } from "./value.js";
import { calculateQualityScores } from "./quality.js";
import { calculateEarningsScores } from "./earnings.js";
import { calculateMomentumScores } from "./momentum.js";

interface CalculateInput {
  fundamentals: Fundamentals[];
  prices: PriceData[];
  names: Map<string, string>;
}

export function calculateFactorScores(input: CalculateInput): FactorScores[] {
  const { fundamentals, prices, names } = input;
  const w = STRATEGY.FACTOR_WEIGHTS;

  const valueScores = calculateValueScores(fundamentals);
  const qualityScores = calculateQualityScores(fundamentals);
  const earningsScores = calculateEarningsScores(fundamentals);

  const priceMap = new Map(prices.map((p) => [p.code, p]));
  const orderedPrices = fundamentals.map(
    (f) => priceMap.get(f.code) ?? { code: f.code, currentPrice: 0, price1mAgo: 0, price12mAgo: 0 },
  );
  const momentumScores = calculateMomentumScores(orderedPrices);

  const scores: FactorScores[] = fundamentals.map((f, i) => ({
    code: f.code,
    name: names.get(f.code) ?? f.code,
    valueScore: valueScores[i],
    qualityScore: qualityScores[i],
    earningsScore: earningsScores[i],
    momentumScore: momentumScores[i],
    finalScore:
      valueScores[i] * w.value +
      qualityScores[i] * w.quality +
      earningsScores[i] * w.earnings +
      momentumScores[i] * w.momentum,
    rank: 0,
  }));

  scores.sort((a, b) => b.finalScore - a.finalScore);
  scores.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scores;
}
