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
import type { KoScoringData } from "./types.js";
import { KO_CONFIG, KO_STRATEGY } from "./config.js";
import { buildKoUniverse } from "./universe.js";
import { calculateFactorScores } from "./factors/finalScore.js";
import { fetchBulkDartFundamentals } from "./data/dartFinance.js";
import { fetchAccountBalance } from "../../kis/domestic/account.js";
import { fetchBulkPrices } from "../../kis/domestic/price.js";
import { executeOrders } from "../../kis/domestic/order.js";

export class KoMultiFactorStrategy implements RebalanceStrategy {
  readonly config: StrategyConfig = KO_CONFIG;
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  async buildUniverse(): Promise<UniverseStock[]> {
    return buildKoUniverse(this.client);
  }

  async fetchScoringData(universe: UniverseStock[]): Promise<KoScoringData> {
    const codes = universe.map((s) => s.code);

    console.log("[Data] 가격 데이터 조회 중...");
    const prices = await fetchBulkPrices(this.client, codes);
    const priceMap = new Map(prices.map((p) => [p.code, p]));

    console.log(`[Data] 재무 데이터 조회 중 (DART)... (${codes.length}종목)`);
    const dartStocks = universe.map((s) => ({
      code: s.code,
      currentPrice: priceMap.get(s.code)?.currentPrice ?? 0,
      sharesOutstanding: Math.floor(s.marketCap / (priceMap.get(s.code)?.currentPrice || 1)),
    }));
    const fundamentals = await fetchBulkDartFundamentals(dartStocks);

    const names = new Map(universe.map((s) => [s.code, s.name]));

    return { fundamentals, prices, names };
  }

  rankStocks(data: unknown): RankedStock[] {
    const scoringData = data as KoScoringData;
    console.log("[Factor] 팩터 스코어 계산 중...");
    return calculateFactorScores(scoringData);
  }

  buildTargetPortfolio(
    ranked: RankedStock[],
    currentPositions: Position[],
    totalAssets: number,
  ): TargetPortfolioItem[] {
    const currentCodes = new Set(currentPositions.map((p) => p.code));
    const selected: RankedStock[] = [];

    for (const stock of ranked) {
      if (selected.length >= KO_STRATEGY.portfolioSize) break;

      if (stock.rank <= KO_STRATEGY.portfolioSize) {
        selected.push(stock);
        continue;
      }

      if (
        KO_STRATEGY.holdBufferRank !== null &&
        stock.rank <= KO_STRATEGY.holdBufferRank &&
        currentCodes.has(stock.code)
      ) {
        selected.push(stock);
        continue;
      }
    }

    const final = selected
      .sort((a, b) => a.rank - b.rank)
      .slice(0, KO_STRATEGY.portfolioSize);

    const investmentAmount = totalAssets * (1 - KO_STRATEGY.cashRatio);
    const perStockAmount = investmentAmount / KO_STRATEGY.portfolioSize;
    const perStockWeight = (1 - KO_STRATEGY.cashRatio) / KO_STRATEGY.portfolioSize;

    return final.map((s) => ({
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
    return fetchAccountBalance(this.client);
  }

  async fetchPrices(codes: string[]): Promise<PriceData[]> {
    return fetchBulkPrices(this.client, codes);
  }

  async executeOrders(actions: RebalanceAction[], _priceMap: Map<string, number>): Promise<void> {
    return executeOrders(this.client, actions);
  }
}
