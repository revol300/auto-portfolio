import type { AxiosInstance } from "axios";
import type { PriceData } from "../../types.js";

export async function fetchPriceData(
  client: AxiosInstance,
  code: string,
): Promise<PriceData> {
  const res = await client.get(
    "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
    {
      headers: {
        tr_id: "FHKST03010100",
      },
      params: {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: formatDate(monthsAgo(12)),
        FID_INPUT_DATE_2: formatDate(new Date()),
        FID_PERIOD_DIV_CODE: "M",
        FID_ORG_ADJ_PRC: "0",
      },
    },
  );

  // TODO: KIS API 응답에 맞게 매핑
  const prices: { stck_bsop_date: string; stck_clpr: string }[] =
    res.data.output2 ?? [];

  const currentPrice = prices.length > 0 ? Number(prices[0].stck_clpr) : 0;
  const price1mAgo = prices.length > 1 ? Number(prices[1].stck_clpr) : currentPrice;
  const price12mAgo =
    prices.length >= 12 ? Number(prices[11].stck_clpr) : currentPrice;

  return { code, currentPrice, price1mAgo, price12mAgo };
}

export async function fetchBulkPrices(
  client: AxiosInstance,
  codes: string[],
): Promise<PriceData[]> {
  const results: PriceData[] = [];
  for (const code of codes) {
    const data = await fetchPriceData(client, code);
    results.push(data);
  }
  return results;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
