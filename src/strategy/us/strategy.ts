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
import type { UsTvStock, UsScoringData } from "./types.js";
import { US_CONFIG, US_STRATEGY } from "./config.js";
import { buildUsUniverse } from "./universe.js";
import { rankByMomentum } from "./momentum.js";
import { fetchBulkPrices12mAgo } from "../../kis/overseas/dailyPrice.js";
import { fetchOverseasAccountBalance } from "../../kis/overseas/account.js";
import { fetchBulkOverseasPrices } from "../../kis/overseas/price.js";
import { executeOverseasOrders } from "../../kis/overseas/order.js";

export class UsEvEbitdaStrategy implements RebalanceStrategy {
  readonly config: StrategyConfig = US_CONFIG;
  private client: AxiosInstance;
  private exchangeMap = new Map<string, string>();

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  async buildUniverse(): Promise<UniverseStock[]> {
    const stocks = await buildUsUniverse();

    for (const s of stocks) {
      this.exchangeMap.set(s.code, s.exchange);
    }
    // IEF exchange 등록
    this.exchangeMap.set(US_STRATEGY.iefSymbol, US_STRATEGY.iefExchange);

    return stocks;
  }

  async fetchScoringData(universe: UniverseStock[]): Promise<UsScoringData> {
    const tvStocks = universe as UsTvStock[];

    console.log(`[Data] 12M 가격 조회 중... (${tvStocks.length}종목)`);

    const stocks = tvStocks.map((s) => ({
      symbol: s.code,
      exchange: s.exchange,
    }));
    const prices12mAgo = await fetchBulkPrices12mAgo(this.client, stocks);

    const momentumData = tvStocks.map((s) => {
      const price12mAgo = prices12mAgo.get(s.code) ?? 0;
      const momentum12m = price12mAgo > 0 ? s.price / price12mAgo - 1 : NaN;
      return {
        code: s.code,
        name: s.name,
        exchange: s.exchange,
        currentPrice: s.price,
        price12mAgo,
        momentum12m,
        evEbitda: s.evEbitda,
      };
    });

    const validCount = momentumData.filter(
      (d) => d.momentum12m > 0 && Number.isFinite(d.momentum12m),
    ).length;
    console.log(`[Data] 양의 모멘텀 종목: ${validCount}/${momentumData.length}`);

    return { momentumData };
  }

  rankStocks(data: unknown): RankedStock[] {
    const scoringData = data as UsScoringData;
    console.log("[Ranking] Momentum 랭킹 계산 중...");
    return rankByMomentum(scoringData.momentumData);
  }

  buildTargetPortfolio(
    ranked: RankedStock[],
    _currentPositions: Position[],
    totalAssets: number,
  ): TargetPortfolioItem[] {
    const portfolioSize = US_STRATEGY.portfolioSize;
    const selected = ranked.slice(0, portfolioSize);

    const perSlotWeight = 1 / portfolioSize;
    const perSlotAmount = totalAssets * perSlotWeight;

    const items: TargetPortfolioItem[] = selected.map((s) => ({
      code: s.code,
      name: s.name,
      rank: s.rank,
      score: s.score,
      targetWeight: perSlotWeight,
      targetAmount: perSlotAmount,
      targetQuantity: 0,
    }));

    // 빈 슬롯은 IEF로 채움
    const emptySlots = portfolioSize - selected.length;
    if (emptySlots > 0) {
      const iefWeight = emptySlots * perSlotWeight;
      const iefAmount = emptySlots * perSlotAmount;
      items.push({
        code: US_STRATEGY.iefSymbol,
        name: "iShares 7-10 Year Treasury Bond ETF",
        rank: 0,
        score: 0,
        targetWeight: iefWeight,
        targetAmount: iefAmount,
        targetQuantity: 0,
      });
      console.log(
        `[Portfolio] 주식 ${selected.length}종목 (${(selected.length * perSlotWeight * 100).toFixed(0)}%) + IEF ${emptySlots}슬롯 (${(iefWeight * 100).toFixed(0)}%)`,
      );
    } else {
      console.log(`[Portfolio] 주식 ${selected.length}종목 (100%)`);
    }

    return items;
  }

  async fetchAccountBalance(): Promise<AccountBalance> {
    return fetchOverseasAccountBalance(this.client);
  }

  async fetchPrices(codes: string[]): Promise<PriceData[]> {
    const stocks = codes.map((code) => ({
      symbol: code,
      exchange: this.exchangeMap.get(code) ?? "NYS",
    }));
    return fetchBulkOverseasPrices(this.client, stocks);
  }

  async executeOrders(actions: RebalanceAction[], priceMap: Map<string, number>, _exchangeMap: Map<string, string>): Promise<void> {
    return executeOverseasOrders(this.client, actions, priceMap, this.exchangeMap);
  }
}
