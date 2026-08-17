import type { StrategyConfig } from "../types.js";

export const US_CONFIG: StrategyConfig = {
  marketId: "us",
  portfolioSize: 25,
  cashRatio: 0.01,
  holdBufferRank: null,
};

export const US_STRATEGY = {
  ...US_CONFIG,

  exchanges: ["NAS", "NYS", "AMS"] as readonly string[],
  minPrice: 5,
  minMarketCap: 500_000_000,

  liquidity: {
    mode: "avg_20d" as const,
    minDollarVolume: 5_000_000,
    lookbackDays: 20,
  },

  excludeFinancials: true,
  excludeDr: true,
  commonStockOnly: true,

  minEbitda: 0,
  minEvEbitda: 0,
} as const;
