import type { RankedStock } from "../types.js";
import type { UsEvEbitdaData, UsScoringData } from "./types.js";

export function rankByEvEbitda(data: UsScoringData): RankedStock[] {
  const valid = data.evEbitdaData
    .filter(
      (d) =>
        d.ebitda > 0 &&
        d.enterpriseValue > 0 &&
        d.evEbitda > 0 &&
        Number.isFinite(d.evEbitda),
    )
    .sort((a, b) => a.evEbitda - b.evEbitda);

  return valid.map((d, i) => ({
    code: d.code,
    name: d.name,
    rank: i + 1,
    score: 1 / d.evEbitda,
    scoringDetails: {
      marketCap: d.marketCap,
      totalDebt: d.totalDebt,
      cash: d.cash,
      ebitda: d.ebitda,
      enterpriseValue: d.enterpriseValue,
      evEbitda: d.evEbitda,
    },
  }));
}
