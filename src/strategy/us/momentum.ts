import type { RankedStock } from "../types.js";
import type { UsMomentumData } from "./types.js";

export function rankByMomentum(data: UsMomentumData[]): RankedStock[] {
  const positive = data
    .filter(
      (d) =>
        d.momentum12m > 0 &&
        Number.isFinite(d.momentum12m) &&
        d.price12mAgo > 0,
    )
    .sort((a, b) => b.momentum12m - a.momentum12m);

  return positive.map((d, i) => ({
    code: d.code,
    name: d.name,
    rank: i + 1,
    score: d.momentum12m,
    scoringDetails: {
      momentum12m: d.momentum12m,
      currentPrice: d.currentPrice,
      price12mAgo: d.price12mAgo,
      evEbitda: d.evEbitda,
    },
  }));
}
