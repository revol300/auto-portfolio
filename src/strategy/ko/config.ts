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

  // HTS 조건검색식 seq 번호 (eFriend Expert에서 생성 후 설정)
  // 조건식 내용: 스팩/리츠/ETF/ETN/우선주 제외, 20일 평균 거래대금 >= 5억원
  CONDITION_SEQ: process.env.KIS_KO_CONDITION_SEQ ?? "",

  MARKET_CAP_BOTTOM_PERCENTILE: 0.2,
} as const;
