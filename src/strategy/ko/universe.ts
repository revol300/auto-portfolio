import type { AxiosInstance } from "axios";
import type { KoStock } from "./types.js";
import { fetchConditionResult } from "../../kis/domestic/stock.js";
import { filterByMarketCap } from "./filters.js";
import { KO_STRATEGY } from "./config.js";

export async function buildKoUniverse(client: AxiosInstance): Promise<KoStock[]> {
  const seq = KO_STRATEGY.CONDITION_SEQ;
  if (!seq) {
    throw new Error(
      "[Universe] KIS_KO_CONDITION_SEQ 환경변수가 설정되지 않았습니다. " +
      "HTS(eFriend Expert)에서 조건검색식을 생성한 후 seq 번호를 설정하세요.",
    );
  }

  let stocks = await fetchConditionResult(client, seq);
  console.log(`[Universe] 조건검색 결과: ${stocks.length}종목`);

  stocks = filterByMarketCap(stocks);
  console.log(`[Universe] 시가총액 하위 20% 제거 후: ${stocks.length}`);

  return stocks;
}
