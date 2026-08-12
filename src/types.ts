export interface Stock {
  code: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  marketCap: number;
  avgTradingValue20d: number;
}

export interface Fundamentals {
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

export interface PriceData {
  code: string;
  currentPrice: number;
  price1mAgo: number;
  price12mAgo: number;
}

export interface FactorScores {
  code: string;
  name: string;
  valueScore: number;
  qualityScore: number;
  earningsScore: number;
  momentumScore: number;
  finalScore: number;
  rank: number;
}

export interface Position {
  code: string;
  name: string;
  quantity: number;
  currentPrice: number;
  evaluationAmount: number;
}

export interface AccountBalance {
  totalAssets: number;
  cashBalance: number;
  positions: Position[];
}

export type RebalanceActionType = "BUY" | "SELL" | "HOLD";

export interface RebalanceAction {
  code: string;
  name: string;
  currentQuantity: number;
  targetQuantity: number;
  action: RebalanceActionType;
  orderQuantity: number;
  targetAmount: number;
}

export interface RebalancePlan {
  runId: string;
  quarter: string;
  executedAt: string;
  totalAssets: number;
  investmentAmount: number;
  cashTarget: number;
  actions: RebalanceAction[];
}

export interface TargetPortfolioItem {
  code: string;
  name: string;
  rank: number;
  finalScore: number;
  targetWeight: number;
  targetAmount: number;
  targetQuantity: number;
}
