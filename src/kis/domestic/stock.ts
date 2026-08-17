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

/** HTS에 저장된 조건검색식 목록을 조회한다. */
export interface ConditionItem {
  seq: string;
  name: string;
}

export async function fetchConditionList(
  client: AxiosInstance,
): Promise<ConditionItem[]> {
  const res = await client.get(
    "/uapi/domestic-stock/v1/quotations/psearch-title",
    {
      headers: {
        tr_id: "HHKST03900300",
      },
      params: {
        user_id: "",
      },
    },
  );

  return (res.data.output2 ?? []).map((item: Record<string, string>) => ({
    seq: item.seq ?? "",
    name: item.condition_nm ?? "",
  }));
}

/** HTS 조건검색식의 결과 종목을 조회한다. */
export async function fetchConditionResult(
  client: AxiosInstance,
  seq: string,
): Promise<KoStock[]> {
  const res = await client.get(
    "/uapi/domestic-stock/v1/quotations/psearch-result",
    {
      headers: {
        tr_id: "HHKST03900400",
      },
      params: {
        user_id: "",
        seq,
      },
    },
  );

  // TODO: 실제 API 응답 필드명 확인 후 매핑 보정 필요
  // KIS Developers 포탈에서 psearch-result 응답 구조 확인할 것
  const items: KoStock[] = (res.data.output2 ?? []).map(
    (item: Record<string, string>) => ({
      code: item.code ?? item.stck_shrn_iscd ?? "",
      name: item.code_name ?? item.hts_kor_isnm ?? "",
      market: (item.market_name?.includes("코스닥") ? "KOSDAQ" : "KOSPI") as
        "KOSPI" | "KOSDAQ",
      marketCap: Number(item.stck_avls ?? item.mktc_amt ?? 0),
      avgTradingValue20d: Number(item.acml_tr_pbmn ?? 0),
    }),
  );

  return items;
}
