import type { AxiosInstance } from "axios";
import type { Stock } from "../types.js";
import { fetchStockList } from "../kis/stock.js";
import { removeExcluded, filterByLiquidity, filterByMarketCap } from "./filters.js";

export async function buildUniverse(client: AxiosInstance): Promise<Stock[]> {
  const [kospi, kosdaq] = await Promise.all([
    fetchStockList(client, "KOSPI"),
    fetchStockList(client, "KOSDAQ"),
  ]);

  let stocks = [...kospi, ...kosdaq];

  console.log(`[Universe] 전체 종목: ${stocks.length}`);

  stocks = removeExcluded(stocks);
  console.log(`[Universe] 제외 조건 적용 후: ${stocks.length}`);

  stocks = filterByLiquidity(stocks);
  console.log(`[Universe] 유동성 필터 후: ${stocks.length}`);

  stocks = filterByMarketCap(stocks);
  console.log(`[Universe] 시가총액 하위 20%: ${stocks.length}`);

  return stocks;
}
