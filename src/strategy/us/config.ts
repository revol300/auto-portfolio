import type { StrategyConfig } from "../types.js";

export const US_CONFIG: StrategyConfig = {
  marketId: "us",
  portfolioSize: 25,
  cashRatio: 0,
  holdBufferRank: null,
};

export const US_STRATEGY = {
  ...US_CONFIG,

  valueUniverseSize: 50,
  momentumMonths: 12,

  iefSymbol: "IEF",
  iefExchange: "NYS",

  minPrice: 5,
  minMarketCap: 500_000_000,
  minDollarVolume: 5_000_000,
  excludeFinancials: true,
} as const;
