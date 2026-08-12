import type { Stock } from "../types.js";
import { STRATEGY } from "../config/strategy.js";

const EXCLUDED_SUFFIXES = ["스팩", "리츠", "ETF", "ETN"];
const EXCLUDED_PATTERNS = [/우$/, /우B$/, /우C$/];

export function removeExcluded(stocks: Stock[]): Stock[] {
  return stocks.filter((s) => {
    if (EXCLUDED_SUFFIXES.some((suffix) => s.name.includes(suffix))) return false;
    if (EXCLUDED_PATTERNS.some((p) => p.test(s.name))) return false;
    return true;
  });
}

export function filterByLiquidity(stocks: Stock[]): Stock[] {
  return stocks.filter(
    (s) => s.avgTradingValue20d >= STRATEGY.MIN_TRADING_VALUE,
  );
}

export function filterByMarketCap(stocks: Stock[]): Stock[] {
  if (stocks.length === 0) return [];

  const sorted = [...stocks].sort((a, b) => a.marketCap - b.marketCap);
  const cutoff = Math.ceil(stocks.length * STRATEGY.MARKET_CAP_BOTTOM_PERCENTILE);

  return sorted.slice(0, cutoff);
}
