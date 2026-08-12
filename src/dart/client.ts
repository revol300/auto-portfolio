import axios, { type AxiosInstance } from "axios";

let dartClient: AxiosInstance | null = null;

export function getDartClient(): AxiosInstance {
  if (dartClient) return dartClient;

  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    throw new Error("DART_API_KEY 환경변수를 설정하세요.");
  }

  dartClient = axios.create({
    baseURL: "https://opendart.fss.or.kr/api",
    params: { crtfc_key: apiKey },
  });

  return dartClient;
}
