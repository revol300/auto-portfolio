import type { AxiosInstance } from "axios";
import type { UsStock } from "./types.js";
import { searchOverseasStocks, type KisSearchCondition } from "../../kis/overseas/stock.js";
import { US_STRATEGY } from "./config.js";
import { filterNonCommonStock, filterFinancials, filterByLiquidity } from "./filters.js";

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

  let stocks: UsStock[] = results.flat().map((item) => ({
    code: item.symbol,
    name: item.name,
    marketCap: item.marketCap,
    exchange: item.exchange,
    sector: "",
    price: item.price,
    dollarVolume: item.price * item.volume,
  }));
  console.log(`[Universe] KIS 조건검색 결과: ${stocks.length}`);

  stocks = filterNonCommonStock(stocks);
  console.log(`[Universe] 보통주 필터 후: ${stocks.length}`);

  stocks = filterFinancials(stocks);
  console.log(`[Universe] 금융주 제외 후: ${stocks.length}`);

  stocks = filterByLiquidity(stocks);
  console.log(`[Universe] 유동성 필터 후: ${stocks.length}`);

  return stocks;
}
