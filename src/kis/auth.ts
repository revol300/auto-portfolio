import fs from "node:fs";
import path from "node:path";
import axios from "axios";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TokenCache {
  access_token: string;
  expires_at: number;
}

const TOKEN_CACHE_PATH = path.join(".", ".token-cache.json");

function loadCachedToken(): TokenCache | null {
  try {
    if (!fs.existsSync(TOKEN_CACHE_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, "utf-8")) as TokenCache;
    if (data.access_token && data.expires_at > Date.now()) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedToken(cache: TokenCache): void {
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cache));
}

function getBaseUrl(): string {
  const env = process.env.KIS_ENV ?? "virtual";
  return env === "prod"
    ? "https://openapi.koreainvestment.com:9443"
    : "https://openapivts.koreainvestment.com:29443";
}

export async function getAccessToken(): Promise<string> {
  const cached = loadCachedToken();
  if (cached) {
    return cached.access_token;
  }

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error("KIS_APP_KEY, KIS_APP_SECRET 환경변수를 설정하세요.");
  }

  const res = await axios.post<TokenResponse>(
    `${getBaseUrl()}/oauth2/tokenP`,
    {
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    },
  );

  const expiresAt = Date.now() + (res.data.expires_in - 60) * 1000;
  saveCachedToken({ access_token: res.data.access_token, expires_at: expiresAt });

  return res.data.access_token;
}

export { getBaseUrl };
