import axios from "axios";
import crypto from "node:crypto";
import { createSpotClient } from "./client.js";

const COIN = "USDT";
const NETWORK = "BSC";

interface NetworkConfig {
  network: string;
  withdrawEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawIntegerMultiple: string;
}

interface CoinConfig {
  coin: string;
  networkList: NetworkConfig[];
}

interface WithdrawAddress {
  address: string;
  coin: string;
  network: string;
  whiteStatus: boolean;
}

interface SpotAccount {
  balances: Array<{
    asset: string;
    free: string;
  }>;
}

interface WithdrawResponse {
  id: string;
}

export interface UsdtBscWithdrawalInfo {
  fee: number;
  minimum: number;
  multiple: number;
  spotBalance: number;
}

function toSafeBinanceError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { code?: number; msg?: string } | undefined;
    if (data?.msg) {
      return new Error(`Binance API 오류${data.code === undefined ? "" : ` (${data.code})`}: ${data.msg}`);
    }
    return new Error(`Binance API 요청 실패: HTTP ${error.response?.status ?? "unknown"}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

function parseConfigNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Binance BSC 출금 설정의 ${field} 값이 올바르지 않습니다: ${value}`);
  }
  return parsed;
}

function parsePositiveConfigNumber(value: string, field: string): number {
  const parsed = parseConfigNumber(value, field);
  if (parsed === 0) {
    throw new Error(`Binance BSC 출금 설정의 ${field} 값은 0보다 커야 합니다.`);
  }
  return parsed;
}

export async function fetchUsdtBscWithdrawalInfo(
  address: string,
): Promise<UsdtBscWithdrawalInfo> {
  const client = createSpotClient();

  try {
    const configResponse = await client.get<CoinConfig[]>("/sapi/v1/capital/config/getall");
    const usdt = configResponse.data.find((item) => item.coin === COIN);
    const bsc = usdt?.networkList.find((item) => item.network === NETWORK);

    if (!bsc) {
      throw new Error("Binance에서 USDT BSC 출금 설정을 찾을 수 없습니다.");
    }
    if (!bsc.withdrawEnable) {
      throw new Error("현재 Binance USDT BSC 출금이 중단되어 있습니다.");
    }

    const addressResponse = await client.get<WithdrawAddress[]>(
      "/sapi/v1/capital/withdraw/address/list",
    );
    const registered = addressResponse.data.find(
      (item) =>
        item.coin === COIN &&
        item.network === NETWORK &&
        item.address === address,
    );

    if (!registered) {
      throw new Error("Bybit 주소가 Binance 출금 주소록에 USDT/BSC로 등록되어 있지 않습니다.");
    }
    if (!registered.whiteStatus) {
      throw new Error("Bybit USDT/BSC 주소가 Binance 출금 화이트리스트에 활성화되어 있지 않습니다.");
    }

    const accountResponse = await client.get<SpotAccount>("/api/v3/account", {
      params: { omitZeroBalances: true },
    });
    const spotBalance = Number(
      accountResponse.data.balances.find((item) => item.asset === COIN)?.free ?? "0",
    );

    return {
      fee: parseConfigNumber(bsc.withdrawFee, "withdrawFee"),
      minimum: parseConfigNumber(bsc.withdrawMin, "withdrawMin"),
      multiple: parsePositiveConfigNumber(
        bsc.withdrawIntegerMultiple,
        "withdrawIntegerMultiple",
      ),
      spotBalance,
    };
  } catch (error) {
    throw toSafeBinanceError(error);
  }
}

export async function withdrawUsdtViaBsc(address: string, amount: string): Promise<string> {
  const client = createSpotClient();

  try {
    const response = await client.post<WithdrawResponse>(
      "/sapi/v1/capital/withdraw/apply",
      null,
      {
        params: {
          coin: COIN,
          network: NETWORK,
          address,
          amount,
          walletType: 0,
          withdrawOrderId: crypto.randomUUID().replaceAll("-", ""),
        },
      },
    );
    return response.data.id;
  } catch (error) {
    throw toSafeBinanceError(error);
  }
}
