import type { Fundamentals } from "../types.js";
import { percentileRank } from "./percentile.js";

export function calculateValueScores(fundamentals: Fundamentals[]): number[] {
  // 낮을수록 좋으므로 ascending=false
  const perScores = percentileRank(fundamentals.map((f) => f.per), false);
  const pbrScores = percentileRank(fundamentals.map((f) => f.pbr), false);
  const psrScores = percentileRank(fundamentals.map((f) => f.psr), false);
  const pcrScores = percentileRank(fundamentals.map((f) => f.pcr), false);

  return fundamentals.map((_, i) =>
    (perScores[i] + pbrScores[i] + psrScores[i] + pcrScores[i]) / 4,
  );
}
