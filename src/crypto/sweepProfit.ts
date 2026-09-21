import fs from "node:fs";
import path from "node:path";
import { fetchFuturesUsdtBalance } from "../binance/futures.js";
import { transferFuturesToSpot } from "../binance/transfer.js";

interface BalanceSnapshot {
  timestamp: string;
  balance: number;
}

const HISTORY_PATH = path.join("output", "crypto", "balance-history.json");

function loadHistory(): BalanceSnapshot[] {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8")) as BalanceSnapshot[];
  } catch {
    return [];
  }
}

const MAX_HISTORY = 100;

function saveHistory(history: BalanceSnapshot[]): void {
  const trimmed = history.length > MAX_HISTORY ? history.slice(-MAX_HISTORY) : history;
  const dir = path.dirname(HISTORY_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(trimmed, null, 2));
}

export async function sweepProfit(options: { execute: boolean }): Promise<void> {
  const dryRun = !options.execute;

  console.log(`[Mode] ${dryRun ? "DRY-RUN" : "EXECUTE"} | Binance Futures Profit Sweep`);

  const currentBalance = await fetchFuturesUsdtBalance();
  console.log(`[Balance] Current futures USDT: ${currentBalance.toFixed(2)}`);

  const history = loadHistory();

  if (history.length === 0) {
    console.log("[Info] 저장된 잔고 기록이 없습니다. 현재 잔고만 저장합니다.");
    history.push({ timestamp: new Date().toISOString(), balance: currentBalance });
    saveHistory(history);
    console.log("[Done] 다음 실행 시 비교가 시작됩니다.");
    return;
  }

  const latest = history[history.length - 1];
  console.log(`[Balance] 이전 스냅샷 (${latest.timestamp}): ${latest.balance.toFixed(2)}`);

  const profit = currentBalance - latest.balance;
  console.log(`[Profit] ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} USDT`);

  if (profit <= 0) {
    console.log("[Skip] 수익 없음. 이체하지 않습니다.");
    if (!dryRun) {
      history.push({ timestamp: new Date().toISOString(), balance: currentBalance });
      saveHistory(history);
    }
    return;
  }

  const transferAmount = Math.floor(profit * 50) / 100;
  console.log(`[Transfer] 수익의 절반: ${transferAmount.toFixed(2)} USDT`);

  if (transferAmount < 1) {
    console.log("[Skip] 이체 금액이 1 USDT 미만입니다. 건너뜁니다.");
    if (!dryRun) {
      history.push({ timestamp: new Date().toISOString(), balance: currentBalance });
      saveHistory(history);
    }
    return;
  }

  if (dryRun) {
    console.log(`[DRY-RUN] ${transferAmount.toFixed(2)} USDT Futures → Spot 이체 예정`);
  } else {
    const tranId = await transferFuturesToSpot(transferAmount);
    console.log(`[Transferred] ${transferAmount.toFixed(2)} USDT (tranId: ${tranId})`);
    history.push({ timestamp: new Date().toISOString(), balance: currentBalance });
    saveHistory(history);
  }
  console.log("[Done] Profit sweep 완료.");
}
