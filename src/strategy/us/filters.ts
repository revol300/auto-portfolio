import type { UsStock } from "./types.js";
import { US_STRATEGY } from "./config.js";

// KIS 해외주식 마스터에서 보통주 여부를 판별할 수 없으므로
// 이름 패턴으로 ETF/ETN/ADR/DR 등 비보통주를 제외한다.
const NON_COMMON_PATTERNS = [
  /\bETF\b/i,
  /\bETN\b/i,
  /\bETP\b/i,
  /\bADR\b/i,
  /\bDepositary\b/i,
  /\bNotes?\b/i,
  /\bWarrant/i,
  /\bRight/i,
  /\bUnit\b/i,
  /\bPreferred\b/i,
  /\bPfd\b/i,
];

const FINANCIAL_SECTORS = [
  "Financial",
  "Financials",
  "Banks",
  "Insurance",
  "Capital Markets",
];

export function filterNonCommonStock(stocks: UsStock[]): UsStock[] {
  return stocks.filter(
    (s) => !NON_COMMON_PATTERNS.some((p) => p.test(s.name)),
  );
}

export function filterFinancials(stocks: UsStock[]): UsStock[] {
  if (!US_STRATEGY.excludeFinancials) return stocks;
  return stocks.filter(
    (s) => !s.sector || !FINANCIAL_SECTORS.some((f) => s.sector.includes(f)),
  );
}

export function filterByLiquidity(stocks: UsStock[]): UsStock[] {
  return stocks.filter(
    (s) => s.dollarVolume >= US_STRATEGY.liquidity.minDollarVolume,
  );
}
