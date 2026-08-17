import type { AxiosInstance } from "axios";
import type { PriceData } from "../../types.js";

export async function fetchOverseasPrice(
  client: AxiosInstance,
  exchange: string,
  symbol: string,
): Promise<number> {
  const res = await client.get(
    "/uapi/overseas-price/v1/quotations/price",
    {
      headers: {
        tr_id: "HHDFS00000300",
      },
      params: {
        AUTH: "",
        EXCD: exchange,
        SYMB: symbol,
      },
    },
  );

  return Number(res.data.output?.last ?? 0);
}

export async function fetchBulkOverseasPrices(
  client: AxiosInstance,
  symbols: string[],
): Promise<PriceData[]> {
  const results: PriceData[] = [];

  for (const symbol of symbols) {
    // TODO: exchange 정보를 symbol에서 분리하거나 별도로 전달
    const price = await fetchOverseasPrice(client, "NAS", symbol);
    results.push({
      code: symbol,
      currentPrice: price,
      price1mAgo: price,
      price12mAgo: price,
    });
    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}
