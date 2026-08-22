import axios from "axios";

const SCANNER_URL = "https://scanner.tradingview.com/america/scan";

interface TVFilter {
  left: string;
  operation: string;
  right: string | number | boolean | (string | number)[];
}

interface TVScanResult {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  marketCap: number;
  evEbitda: number;
  sector: string;
  dollarVolume: number;
}

function extractSymbol(s: string): string {
  return s.includes(":") ? s.split(":")[1] : s;
}

function extractExchange(s: string): string {
  if (!s.includes(":")) return "";
  const ex = s.split(":")[0];
  // TradingView exchange → KIS exchange code 매핑
  if (ex === "NASDAQ") return "NAS";
  if (ex === "NYSE") return "NYS";
  if (ex === "AMEX") return "AMS";
  return ex;
}

export async function fetchEvEbitdaTop(
  filters: TVFilter[],
  limit: number,
): Promise<TVScanResult[]> {
  const columns = [
    "name",                          // 0: ticker
    "description",                   // 1: company name
    "close",                         // 2: price
    "market_cap_basic",              // 3: market cap
    "enterprise_value_ebitda_ttm",   // 4: EV/EBITDA TTM
    "sector",                        // 5: sector
    "Value.Traded",                  // 6: dollar volume
  ];

  const payload = {
    filter: filters,
    options: { lang: "en" },
    symbols: { query: { types: [] }, tickers: [] },
    columns,
    sort: { sortBy: "enterprise_value_ebitda_ttm", sortOrder: "asc" },
    range: [0, limit],
  };

  const res = await axios.post(SCANNER_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 30_000,
  });

  const data = res.data as {
    totalCount: number;
    data: Array<{ s: string; d: unknown[] }>;
  };

  if (!data?.data || !Array.isArray(data.data)) {
    throw new Error("TradingView Scanner 응답 형식 오류");
  }

  return data.data
    .map((item) => {
      const d = item.d;
      return {
        symbol: extractSymbol(item.s),
        name: (d[1] as string) || (d[0] as string) || "",
        exchange: extractExchange(item.s),
        price: Number(d[2] ?? 0),
        marketCap: Number(d[3] ?? 0),
        evEbitda: Number(d[4] ?? 0),
        sector: (d[5] as string) || "",
        dollarVolume: Number(d[6] ?? 0),
      };
    })
    .filter((s) => s.symbol && s.evEbitda > 0);
}
