import type { AxiosInstance } from "axios";

interface MonthlyBar {
  date: string; // YYYYMMDD
  close: number;
}

export async function fetchOverseasMonthlyPrices(
  client: AxiosInstance,
  exchange: string,
  symbol: string,
): Promise<MonthlyBar[]> {
  const res = await client.get(
    "/uapi/overseas-price/v1/quotations/dailyprice",
    {
      headers: {
        tr_id: "HHDFS76240000",
      },
      params: {
        AUTH: "",
        EXCD: exchange,
        SYMB: symbol,
        GUBN: "2", // 월봉
        BYMD: "",
        MODP: "1", // 수정주가
      },
    },
  );

  const items = res.data.output2 ?? [];
  return items
    .map((item: Record<string, string>) => ({
      date: item.xymd ?? "",
      close: Number(item.clos ?? 0),
    }))
    .filter((bar: MonthlyBar) => bar.date && bar.close > 0);
}

export async function fetchPrice12mAgo(
  client: AxiosInstance,
  exchange: string,
  symbol: string,
): Promise<number> {
  const bars = await fetchOverseasMonthlyPrices(client, exchange, symbol);
  if (bars.length === 0) return 0;

  const now = new Date();
  const target = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const targetStr = [
    String(target.getFullYear()),
    String(target.getMonth() + 1).padStart(2, "0"),
  ].join("");

  // 12개월 전에 가장 가까운 월봉 찾기
  let best: MonthlyBar | null = null;
  let bestDiff = Infinity;

  for (const bar of bars) {
    const barYM = bar.date.slice(0, 6);
    const diff = Math.abs(Number(barYM) - Number(targetStr));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = bar;
    }
  }

  return best?.close ?? 0;
}

export async function fetchBulkPrices12mAgo(
  client: AxiosInstance,
  stocks: Array<{ symbol: string; exchange: string }>,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  for (const stock of stocks) {
    const price = await fetchPrice12mAgo(client, stock.exchange, stock.symbol);
    result.set(stock.symbol, price);
    await new Promise((r) => setTimeout(r, 100));
  }

  return result;
}
