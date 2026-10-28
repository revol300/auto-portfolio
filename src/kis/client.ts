import axios, { type AxiosInstance } from "axios";
import { getAccessToken, getBaseUrl } from "./auth.js";

let clientInstance: AxiosInstance | null = null;

let lastRequestTime = 0;
let requestQueue = Promise.resolve();

export async function createKisClient(): Promise<AxiosInstance> {
  if (clientInstance) return clientInstance;

  const token = await getAccessToken();
  const appKey = process.env.KIS_APP_KEY!;
  const appSecret = process.env.KIS_APP_SECRET!;
  const minRequestInterval = process.env.KIS_ENV === "prod" ? 1_000 : 1_100;

  const client = axios.create({
    baseURL: getBaseUrl(),
    headers: {
      Authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  // 동시 요청도 큐에서 순서대로 대기하여 호출 간격을 보장한다.
  client.interceptors.request.use(async (config) => {
    requestQueue = requestQueue.then(async () => {
      const elapsed = Date.now() - lastRequestTime;
      if (elapsed < minRequestInterval) {
        await new Promise((r) => setTimeout(r, minRequestInterval - elapsed));
      }
      lastRequestTime = Date.now();
    });
    await requestQueue;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error.response?.status === 401) {
        const newToken = await getAccessToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return client.request(error.config);
      }
      throw error;
    },
  );

  clientInstance = client;
  return client;
}
