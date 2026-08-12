import axios, { type AxiosInstance } from "axios";
import { getAccessToken, getBaseUrl } from "./auth.js";

let clientInstance: AxiosInstance | null = null;

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
