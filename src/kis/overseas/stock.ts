import type { AxiosInstance } from "axios";

export interface KisSearchCondition {
  EXCD: string;
  CO_YN_PRICECUR: string;
  CO_ST_PRICECUR: string;
  CO_EN_PRICECUR: string;
  CO_YN_VALX: string;
  CO_ST_VALX: string;
  CO_EN_VALX: string;
  CO_YN_VOLUME: string;
  CO_YN_AMT: string;
  CO_YN_EPS: string;
  CO_YN_PER: string;
}

export interface KisOverseasStock {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  marketCap: number;
  volume: number;
}

export async function searchOverseasStocks(
  client: AxiosInstance,
  condition: KisSearchCondition,
): Promise<KisOverseasStock[]> {
  // TODO: KIS 해외주식 조건검색 API 연동
  const res = await client.get(
    "/uapi/overseas-stock/v1/quotations/inquire-search",
    {
      headers: {
        tr_id: "HHDFS76200200",
      },
      params: condition,
    },
  );

  const items: KisOverseasStock[] = (res.data.output2 ?? []).map(
    (item: Record<string, string>) => ({
      symbol: item.symb ?? "",
      name: item.name ?? "",
      exchange: condition.EXCD,
      price: Number(item.last ?? 0),
      marketCap: Number(item.valx ?? 0) * 1000, // 천 단위 → 달러
      volume: Number(item.tvol ?? 0),
    }),
  );

  return items;
}
