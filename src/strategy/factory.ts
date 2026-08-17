import type { AxiosInstance } from "axios";
import type { RebalanceStrategy, MarketId } from "./types.js";
import { KoMultiFactorStrategy } from "./ko/strategy.js";
import { UsEvEbitdaStrategy } from "./us/strategy.js";

export function createStrategy(
  marketId: MarketId,
  client: AxiosInstance,
): RebalanceStrategy {
  switch (marketId) {
    case "ko":
      return new KoMultiFactorStrategy(client);
    case "us":
      return new UsEvEbitdaStrategy(client);
    default:
      throw new Error(`Unknown market: ${marketId}`);
  }
}
