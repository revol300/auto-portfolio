import axios, { type AxiosInstance } from "axios";
import { getAccessToken, getBaseUrl } from "./auth.js";

let clientInstance: AxiosInstance | null = null;

const MIN_REQUEST_INTERVAL = 120; // ms (~8 req/sec, KIS 초당 10건 제한 대비 안전 마진)
let lastRequestTime = 0;

export async function createKisClient(): Promise<AxiosInstance> {
  if (clientInstance) return clientInstance;

  const token = await getAccessToken();
  const appKey = process.env.KIS_APP_KEY!;
  const appSecret = process.env.KIS_APP_SECRET!;

  clientInstance = axios.create({
    baseURL: getBaseUrl(),
    headers: {
      Authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  // Rate limiter: 요청 간 최소 간격 보장
  clientInstance.interceptors.request.use(async (config) => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
    }
    lastRequestTime = Date.now();
    return config;
  });

  clientInstance.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error.response?.status === 401) {
        const newToken = await getAccessToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios.request(error.config);
      }
      throw error;
    },
  );

  return clientInstance;
}
