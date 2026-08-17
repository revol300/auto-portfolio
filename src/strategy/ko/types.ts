import type { UniverseStock } from "../../types.js";

export interface KoStock extends UniverseStock {
  market: "KOSPI" | "KOSDAQ";
  avgTradingValue20d: number;
}

export interface KoFundamentals {
  code: string;
  per: number | null;
  pbr: number | null;
  psr: number | null;
  pcr: number | null;
  grossProfitToAssets: number | null;
  roa: number | null;
  assetGrowth: number | null;
  debtRatio: number | null;
  operatingProfitGrowthYoY: number | null;
  netIncomeGrowthYoY: number | null;
}

export interface KoScoringData {
  fundamentals: KoFundamentals[];
  prices: import("../../types.js").PriceData[];
  names: Map<string, string>;
}
