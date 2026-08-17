import type { AxiosInstance } from "axios";
import type { KoStock } from "../../strategy/ko/types.js";

export async function fetchStockList(
  client: AxiosInstance,
  market: "KOSPI" | "KOSDAQ",
): Promise<KoStock[]> {
  const marketCode = market === "KOSPI" ? "J" : "Q";

  const res = await client.get("/uapi/domestic-stock/v1/quotations/inquire-price", {
    headers: {
      tr_id: "CTPF1002R",
    },
    params: {
      PDNO: "",
      PRDT_TYPE_CD: marketCode,
    },
  });

  // TODO: KIS API 응답 구조에 맞게 매핑 구현
  // 실제 API 연동 시 종목 마스터 조회 tr_id와 응답 필드를 확인해야 함
  const items: KoStock[] = (res.data.output ?? []).map((item: Record<string, string>) => ({
    code: item.mksc_shrn_iscd ?? item.stck_shrn_iscd ?? "",
    name: item.hts_kor_isnm ?? "",
    market,
    marketCap: Number(item.stck_avls ?? 0),
    avgTradingValue20d: 0,
  }));

  return items;
}
