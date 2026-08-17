import type { StrategyConfig } from "../types.js";

export const KO_CONFIG: StrategyConfig = {
  marketId: "ko",
  portfolioSize: 20,
  cashRatio: 0.02,
  holdBufferRank: 30,
};

export const KO_STRATEGY = {
  ...KO_CONFIG,

  FACTOR_WEIGHTS: {
    value: 0.3,
    quality: 0.3,
    earnings: 0.3,
    momentum: 0.1,
  },

  MIN_TRADING_VALUE: 500_000_000,
  MARKET_CAP_BOTTOM_PERCENTILE: 0.2,
} as const;
