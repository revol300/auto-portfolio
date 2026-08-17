import type { AxiosInstance } from "axios";
import type { UsStock } from "./types.js";
import { searchOverseasStocks, type KisSearchCondition } from "../../kis/overseas/stock.js";
import { US_STRATEGY } from "./config.js";

function buildCondition(exchange: string): KisSearchCondition {
  return {
    EXCD: exchange,
    CO_YN_PRICECUR: "1",
    CO_ST_PRICECUR: String(US_STRATEGY.minPrice),
    CO_EN_PRICECUR: "99999999",
    CO_YN_VALX: "1",
    CO_ST_VALX: String(US_STRATEGY.minMarketCap / 1000),
    CO_EN_VALX: "99999999999",
    CO_YN_VOLUME: "",
    CO_YN_AMT: "",
    CO_YN_EPS: "",
    CO_YN_PER: "",
  };
}

export async function buildUsUniverse(client: AxiosInstance): Promise<UsStock[]> {
  const results = await Promise.all(
    US_STRATEGY.exchanges.map((exchange) =>
      searchOverseasStocks(client, buildCondition(exchange)),
    ),
  );

  const merged = results.flat();
  console.log(`[Universe] KIS 조건검색 후보: ${merged.length}`);

  // TODO: KIS Master JOIN으로 보통주/DR/ETF 필터
  // TODO: 유동성 필터 (20일 평균 거래대금)

  const stocks: UsStock[] = merged.map((item) => ({
    code: item.symbol,
    name: item.name,
    marketCap: item.marketCap,
    exchange: item.exchange,
    sector: "",
    price: item.price,
    dollarVolume: 0,
  }));

  console.log(`[Universe] 필터 후: ${stocks.length}`);

  return stocks;
}
