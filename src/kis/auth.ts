import axios from "axios";

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getBaseUrl(): string {
  const env = process.env.KIS_ENV ?? "virtual";
  return env === "prod"
    ? "https://openapi.koreainvestment.com:9443"
    : "https://openapivts.koreainvestment.com:29443";
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
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

  cachedToken = res.data.access_token;
  tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000;

  return cachedToken;
}

export { getBaseUrl };
