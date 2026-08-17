import type { KoFundamentals } from "../types.js";
import { percentileRank } from "./percentile.js";

export function calculateEarningsScores(fundamentals: KoFundamentals[]): number[] {
  const opGrowthScores = percentileRank(
    fundamentals.map((f) => f.operatingProfitGrowthYoY),
    true,
  );
  const niGrowthScores = percentileRank(
    fundamentals.map((f) => f.netIncomeGrowthYoY),
    true,
  );

  return fundamentals.map((_, i) =>
    (opGrowthScores[i] + niGrowthScores[i]) / 2,
  );
}
