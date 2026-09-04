import axios, { type AxiosInstance } from "axios";
import crypto from "node:crypto";

const BINANCE_SPOT_URL = "https://api.binance.com";
const BINANCE_FUTURES_URL = "https://fapi.binance.com";
const MIN_REQUEST_INTERVAL = 100;

let lastRequestTime = 0;

function sign(queryString: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

function createBinanceClient(baseURL: string): AxiosInstance {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("BINANCE_API_KEY, BINANCE_API_SECRET 환경변수를 설정하세요.");
  }

  const instance = axios.create({
    baseURL,
    headers: { "X-MBX-APIKEY": apiKey },
  });

  instance.interceptors.request.use(async (config) => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
    }
    lastRequestTime = Date.now();

    const params = config.params ?? {};
    params.timestamp = Date.now();
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    params.signature = sign(qs, apiSecret);
    config.params = params;

    return config;
  });

  return instance;
}

export function createFuturesClient(): AxiosInstance {
  return createBinanceClient(BINANCE_FUTURES_URL);
}

export function createSpotClient(): AxiosInstance {
  return createBinanceClient(BINANCE_SPOT_URL);
}
