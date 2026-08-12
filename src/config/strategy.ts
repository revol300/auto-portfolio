export const STRATEGY = {
  FACTOR_WEIGHTS: {
    value: 0.3,
    quality: 0.3,
    earnings: 0.3,
    momentum: 0.1,
  },

  PORTFOLIO_SIZE: 20,
  CASH_RATIO: 0.02,
  HOLD_BUFFER_RANK: 30,

  MIN_TRADING_VALUE: 500_000_000,
  MARKET_CAP_BOTTOM_PERCENTILE: 0.2,

  REBALANCE_MONTHS: [3, 6, 9, 12] as readonly number[],
} as const;
