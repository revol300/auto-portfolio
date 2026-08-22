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
  stocks: Array<{ symbol: string; exchange: string }>,
): Promise<PriceData[]> {
  const results: PriceData[] = [];

  for (const stock of stocks) {
    const price = await fetchOverseasPrice(client, stock.exchange, stock.symbol);
    results.push({
      code: stock.symbol,
      currentPrice: price,
      price1mAgo: price,
      price12mAgo: price,
    });
    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}
