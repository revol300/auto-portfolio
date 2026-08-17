import type { PriceData } from "../../../types.js";
import { percentileRank } from "./percentile.js";

/**
 * 12-1 Momentum: 최근 1개월을 제외한 12개월 수익률
 * = price(t-1m) / price(t-12m) - 1
 */
export function calculateMomentumScores(prices: PriceData[]): number[] {
  const momentumValues = prices.map((p) => {
    if (p.price12mAgo === 0) return null;
    return p.price1mAgo / p.price12mAgo - 1;
  });

  return percentileRank(momentumValues, true);
}
