import type { Fundamentals } from "../types.js";
import { percentileRank } from "./percentile.js";

export function calculateQualityScores(fundamentals: Fundamentals[]): number[] {
  const gpaScores = percentileRank(fundamentals.map((f) => f.grossProfitToAssets), true);
  const roaScores = percentileRank(fundamentals.map((f) => f.roa), true);
  const assetGrowthScores = percentileRank(fundamentals.map((f) => f.assetGrowth), false);
  const debtScores = percentileRank(fundamentals.map((f) => f.debtRatio), false);

  return fundamentals.map((_, i) =>
    (gpaScores[i] + roaScores[i] + assetGrowthScores[i] + debtScores[i]) / 4,
  );
}
