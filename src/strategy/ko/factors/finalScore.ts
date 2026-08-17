import type { PriceData } from "../../../types.js";
import type { KoFundamentals } from "../types.js";
import type { RankedStock } from "../../types.js";
import { KO_STRATEGY } from "../config.js";
import { calculateValueScores } from "./value.js";
import { calculateQualityScores } from "./quality.js";
import { calculateEarningsScores } from "./earnings.js";
import { calculateMomentumScores } from "./momentum.js";

interface CalculateInput {
  fundamentals: KoFundamentals[];
  prices: PriceData[];
  names: Map<string, string>;
}

export function calculateFactorScores(input: CalculateInput): RankedStock[] {
  const { fundamentals, prices, names } = input;
  const w = KO_STRATEGY.FACTOR_WEIGHTS;

  const valueScores = calculateValueScores(fundamentals);
  const qualityScores = calculateQualityScores(fundamentals);
  const earningsScores = calculateEarningsScores(fundamentals);

  const priceMap = new Map(prices.map((p) => [p.code, p]));
  const orderedPrices = fundamentals.map(
    (f) => priceMap.get(f.code) ?? { code: f.code, currentPrice: 0, price1mAgo: 0, price12mAgo: 0 },
  );
  const momentumScores = calculateMomentumScores(orderedPrices);

  const scores: RankedStock[] = fundamentals.map((f, i) => ({
    code: f.code,
    name: names.get(f.code) ?? f.code,
    score:
      valueScores[i] * w.value +
      qualityScores[i] * w.quality +
      earningsScores[i] * w.earnings +
      momentumScores[i] * w.momentum,
    rank: 0,
    scoringDetails: {
      value: valueScores[i],
      quality: qualityScores[i],
      earnings: earningsScores[i],
      momentum: momentumScores[i],
    },
  }));

  scores.sort((a, b) => b.score - a.score);
  scores.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scores;
}
