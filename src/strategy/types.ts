import type {
  UniverseStock,
  PriceData,
  Position,
  AccountBalance,
  RebalanceAction,
  TargetPortfolioItem,
} from "../types.js";

export type MarketId = "ko" | "us";

export interface StrategyConfig {
  marketId: MarketId;
  portfolioSize: number;
  cashRatio: number;
  holdBufferRank: number | null;
}

export interface RankedStock {
  code: string;
  name: string;
  rank: number;
  score: number;
  scoringDetails: Record<string, number>;
}

export interface RebalanceStrategy {
  readonly config: StrategyConfig;
  buildUniverse(): Promise<UniverseStock[]>;
  fetchScoringData(universe: UniverseStock[]): Promise<unknown>;
  rankStocks(data: unknown): RankedStock[];
  buildTargetPortfolio(
    ranked: RankedStock[],
    currentPositions: Position[],
    totalAssets: number,
  ): TargetPortfolioItem[];
  fetchAccountBalance(): Promise<AccountBalance>;
  fetchPrices(codes: string[]): Promise<PriceData[]>;
  executeOrders(actions: RebalanceAction[], priceMap: Map<string, number>, exchangeMap: Map<string, string>): Promise<void>;
}
