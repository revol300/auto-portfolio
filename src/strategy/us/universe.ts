import type { UsTvStock } from "./types.js";
import { US_STRATEGY } from "./config.js";
import { fetchEvEbitdaTop } from "../../tradingview/scanner.js";

export async function buildUsUniverse(): Promise<UsTvStock[]> {
  const filters = [
    { left: "close", operation: "egreater", right: US_STRATEGY.minPrice },
    { left: "market_cap_basic", operation: "egreater", right: US_STRATEGY.minMarketCap },
    { left: "Value.Traded", operation: "egreater", right: US_STRATEGY.minDollarVolume },
    { left: "enterprise_value_ebitda_ttm", operation: "greater", right: 0 },
    { left: "type", operation: "equal", right: "stock" },
  ];

  if (US_STRATEGY.excludeFinancials) {
    filters.push({ left: "sector", operation: "nequal", right: "Finance" });
  }

  console.log("[Universe] TradingView Scanner 조회 중...");

  const results = await fetchEvEbitdaTop(filters, US_STRATEGY.valueUniverseSize);

  console.log(`[Universe] EV/EBITDA Top ${results.length}종목 조회 완료`);

  return results.map((r) => ({
    code: r.symbol,
    name: r.name,
    marketCap: r.marketCap,
    exchange: r.exchange,
    sector: r.sector,
    price: r.price,
    evEbitda: r.evEbitda,
  }));
}
