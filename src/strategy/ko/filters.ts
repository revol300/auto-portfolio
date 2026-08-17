import type { KoStock } from "./types.js";
import { KO_STRATEGY } from "./config.js";

export function filterByMarketCap(stocks: KoStock[]): KoStock[] {
  if (stocks.length === 0) return [];

  const sorted = [...stocks].sort((a, b) => a.marketCap - b.marketCap);
  const cutoff = Math.ceil(stocks.length * KO_STRATEGY.MARKET_CAP_BOTTOM_PERCENTILE);

  return sorted.slice(0, cutoff);
}
