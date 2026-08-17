import type { AxiosInstance } from "axios";
import type {
  UniverseStock,
  PriceData,
  Position,
  AccountBalance,
  RebalanceAction,
  TargetPortfolioItem,
} from "../../types.js";
import type { RebalanceStrategy, StrategyConfig, RankedStock } from "../types.js";
import type { UsScoringData } from "./types.js";
import { US_CONFIG, US_STRATEGY } from "./config.js";
import { buildUsUniverse } from "./universe.js";
import { rankByEvEbitda } from "./ranking.js";
import { fetchOverseasAccountBalance } from "../../kis/overseas/account.js";
import { fetchBulkOverseasPrices } from "../../kis/overseas/price.js";
import { executeOverseasOrders } from "../../kis/overseas/order.js";

export class UsEvEbitdaStrategy implements RebalanceStrategy {
  readonly config: StrategyConfig = US_CONFIG;
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  async buildUniverse(): Promise<UniverseStock[]> {
    return buildUsUniverse(this.client);
  }

  async fetchScoringData(universe: UniverseStock[]): Promise<UsScoringData> {
    // TODO: FundamentalsProvider를 통해 EBITDA/Debt/Cash 조회
    // 현재는 스켈레톤 — Provider 구현체가 필요
    console.log(`[Data] US Fundamentals 조회 중... (${universe.length}종목)`);

    const evEbitdaData = universe.map((s) => ({
      code: s.code,
      name: s.name,
      marketCap: s.marketCap,
      totalDebt: 0,
      cash: 0,
      ebitda: 0,
      enterpriseValue: s.marketCap,
      evEbitda: 0,
    }));

    return { evEbitdaData };
  }

  rankStocks(data: unknown): RankedStock[] {
    const scoringData = data as UsScoringData;
    console.log("[Ranking] EV/EBITDA 랭킹 계산 중...");
    return rankByEvEbitda(scoringData);
  }

  buildTargetPortfolio(
    ranked: RankedStock[],
    _currentPositions: Position[],
    totalAssets: number,
  ): TargetPortfolioItem[] {
    // US: hold buffer 없음, 단순히 상위 N개 선택
    const selected = ranked.slice(0, US_STRATEGY.portfolioSize);

    const investmentAmount = totalAssets * (1 - US_STRATEGY.cashRatio);
    const perStockAmount = investmentAmount / US_STRATEGY.portfolioSize;
    const perStockWeight = (1 - US_STRATEGY.cashRatio) / US_STRATEGY.portfolioSize;

    return selected.map((s) => ({
      code: s.code,
      name: s.name,
      rank: s.rank,
      score: s.score,
      targetWeight: perStockWeight,
      targetAmount: perStockAmount,
      targetQuantity: 0,
    }));
  }

  async fetchAccountBalance(): Promise<AccountBalance> {
    return fetchOverseasAccountBalance(this.client);
  }

  async fetchPrices(codes: string[]): Promise<PriceData[]> {
    return fetchBulkOverseasPrices(this.client, codes);
  }

  async executeOrders(actions: RebalanceAction[]): Promise<void> {
    return executeOverseasOrders(this.client, actions);
  }
}
