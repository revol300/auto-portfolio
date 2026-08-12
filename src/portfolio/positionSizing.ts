import type { TargetPortfolioItem, PriceData } from "../types.js";

export function calculateTargetQuantities(
  portfolio: TargetPortfolioItem[],
  prices: PriceData[],
): TargetPortfolioItem[] {
  const priceMap = new Map(prices.map((p) => [p.code, p.currentPrice]));

  return portfolio.map((item) => {
    const price = priceMap.get(item.code) ?? 0;
    const targetQuantity = price > 0 ? Math.floor(item.targetAmount / price) : 0;

    return { ...item, targetQuantity };
  });
}
