import fs from "node:fs";
import path from "node:path";
import {
  fetchUsdtBscWithdrawalInfo,
  withdrawUsdtViaBsc,
} from "../binance/withdraw.js";

interface BalanceSnapshot {
  timestamp: string;
  balance: number;
}

const HISTORY_PATH = path.join("output", "crypto", "balance-history.json");
const BSC_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function loadLatestSnapshots(): [BalanceSnapshot, BalanceSnapshot] {
  if (!fs.existsSync(HISTORY_PATH)) {
    throw new Error(`${HISTORY_PATH} 파일이 없습니다.`);
  }

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
  } catch {
    throw new Error(`${HISTORY_PATH} 파일을 읽을 수 없습니다.`);
  }

  if (!Array.isArray(data) || data.length < 2) {
    throw new Error(`${HISTORY_PATH}에 유효한 잔고 기록이 2개 이상 필요합니다.`);
  }

  const snapshots = data.slice(-2);
  if (
    !snapshots.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as BalanceSnapshot).timestamp === "string" &&
        Number.isFinite((item as BalanceSnapshot).balance),
    )
  ) {
    throw new Error(`${HISTORY_PATH}에 유효한 잔고 기록이 2개 이상 필요합니다.`);
  }

  return [snapshots[0] as BalanceSnapshot, snapshots[1] as BalanceSnapshot];
}

function resolveAmount(input?: string): { amount: number; source: "automatic" | "manual" } {
  if (input !== undefined) {
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`--amount는 0보다 큰 USDT 숫자여야 합니다. (입력: ${input})`);
    }
    console.log(`[Amount] 수동 지정: ${amount} USDT`);
    return { amount, source: "manual" };
  }

  const [previous, latest] = loadLatestSnapshots();
  const difference = latest.balance - previous.balance;
  console.log(`[Balance] ${previous.timestamp}: ${previous.balance.toFixed(8)} USDT`);
  console.log(`[Balance] ${latest.timestamp}: ${latest.balance.toFixed(8)} USDT`);
  console.log(`[Difference] ${difference >= 0 ? "+" : ""}${difference.toFixed(8)} USDT`);

  const amount = difference * 0.25;
  console.log(`[Amount] 차액의 25%: ${amount.toFixed(8)} USDT`);
  return { amount, source: "automatic" };
}

function floorToMultiple(amount: number, multiple: number): number {
  const scale = 10 ** Math.min(decimalPlaces(multiple), 8);
  const multipleUnits = Math.round(multiple * scale);
  const amountUnits = Math.floor(amount * scale + 1e-7);
  return Math.floor(amountUnits / multipleUnits) * multipleUnits / scale;
}

function decimalPlaces(value: number): number {
  const text = value.toString();
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  return text.split(".")[1]?.length ?? 0;
}

function formatAmount(amount: number, multiple: number): string {
  return amount.toFixed(Math.min(decimalPlaces(multiple), 8));
}

function maskAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function withdrawToBybit(options: {
  execute: boolean;
  amount?: string;
}): Promise<void> {
  const dryRun = !options.execute;
  console.log(`[Mode] ${dryRun ? "DRY-RUN" : "EXECUTE"} | Binance Spot → Bybit`);

  const resolved = resolveAmount(options.amount);
  if (resolved.amount <= 0) {
    console.log("[Skip] 최근 잔고 차액이 양수가 아니므로 출금하지 않습니다.");
    return;
  }

  const address = process.env.BYBIT_USDT_BSC_ADDRESS?.trim();
  if (!address) {
    throw new Error("BYBIT_USDT_BSC_ADDRESS 환경변수를 설정하세요.");
  }
  if (!BSC_ADDRESS_PATTERN.test(address)) {
    throw new Error("BYBIT_USDT_BSC_ADDRESS가 유효한 BSC 주소 형식이 아닙니다.");
  }

  console.log(`[Network] BSC (BEP20)`);
  console.log(`[Address] ${maskAddress(address)}`);

  const info = await fetchUsdtBscWithdrawalInfo(address);
  const amount = floorToMultiple(resolved.amount, info.multiple);
  const amountText = formatAmount(amount, info.multiple);

  if (amount !== resolved.amount) {
    console.log(`[Adjusted] Binance 출금 단위에 맞춰 ${amountText} USDT로 내림`);
  }

  if (amount < info.minimum) {
    const message = `출금액 ${amountText} USDT가 Binance 최소 출금액 ${info.minimum} USDT보다 작습니다.`;
    if (resolved.source === "automatic") {
      console.log(`[Skip] ${message}`);
      return;
    }
    throw new Error(message);
  }
  if (amount > info.spotBalance) {
    throw new Error(
      `Binance Spot USDT 잔액이 부족합니다. (출금: ${amountText}, 사용 가능: ${info.spotBalance})`,
    );
  }
  if (amount <= info.fee) {
    throw new Error(`출금액이 BSC 출금 수수료 ${info.fee} USDT보다 커야 합니다.`);
  }

  console.log(`[Whitelist] Binance USDT/BSC 출금 주소 확인 완료`);
  console.log(`[Amount] ${amountText} USDT`);
  console.log(`[Fee] ${info.fee} USDT`);
  console.log(`[Expected] Bybit 수령 ${(amount - info.fee).toFixed(8).replace(/\.?0+$/, "")} USDT`);

  if (dryRun) {
    console.log("[DRY-RUN] 실제 출금 요청은 전송하지 않았습니다.");
    return;
  }

  const id = await withdrawUsdtViaBsc(address, amountText);
  console.log(`[Withdrawn] Binance 출금 요청 완료 (id: ${id})`);
}
