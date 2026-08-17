import type { KoStock } from "./types.js";
import { KO_STRATEGY } from "./config.js";

const EXCLUDED_SUFFIXES = ["스팩", "리츠", "ETF", "ETN"];
const EXCLUDED_PATTERNS = [/우$/, /우B$/, /우C$/];

export function removeExcluded(stocks: KoStock[]): KoStock[] {
  return stocks.filter((s) => {
    if (EXCLUDED_SUFFIXES.some((suffix) => s.name.includes(suffix))) return false;
    if (EXCLUDED_PATTERNS.some((p) => p.test(s.name))) return false;
    return true;
  });
}

export function filterByLiquidity(stocks: KoStock[]): KoStock[] {
  return stocks.filter(
    (s) => s.avgTradingValue20d >= KO_STRATEGY.MIN_TRADING_VALUE,
  );
}

export function filterByMarketCap(stocks: KoStock[]): KoStock[] {
  if (stocks.length === 0) return [];

  const sorted = [...stocks].sort((a, b) => a.marketCap - b.marketCap);
  const cutoff = Math.ceil(stocks.length * KO_STRATEGY.MARKET_CAP_BOTTOM_PERCENTILE);

  return sorted.slice(0, cutoff);
}
