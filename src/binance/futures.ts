import { createFuturesClient } from "./client.js";

interface FuturesBalanceEntry {
  asset: string;
  balance: string;
  availableBalance: string;
}

export async function fetchFuturesUsdtBalance(): Promise<number> {
  const client = createFuturesClient();
  const res = await client.get<FuturesBalanceEntry[]>("/fapi/v2/balance");
  const usdt = res.data.find((b) => b.asset === "USDT");
  if (!usdt) {
    throw new Error("USDT balance not found in futures account");
  }
  return parseFloat(usdt.balance);
}
