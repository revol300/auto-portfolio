export interface UniverseStock {
  code: string;
  name: string;
  marketCap: number;
}

export interface PriceData {
  code: string;
  currentPrice: number;
  price1mAgo: number;
  price12mAgo: number;
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
  marketId: string;
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
  score: number;
  targetWeight: number;
  targetAmount: number;
  targetQuantity: number;
}
