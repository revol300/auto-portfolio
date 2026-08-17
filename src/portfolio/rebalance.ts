import type {
  AccountBalance,
  TargetPortfolioItem,
  RebalanceAction,
  RebalancePlan,
} from "../types.js";
import type { StrategyConfig } from "../strategy/types.js";

interface RebalanceInput {
  account: AccountBalance;
  targetPortfolio: TargetPortfolioItem[];
  quarter: string;
  config: StrategyConfig;
}

export function createRebalancePlan(input: RebalanceInput): RebalancePlan {
  const { account, targetPortfolio, quarter, config } = input;

  const currentMap = new Map(
    account.positions.map((p) => [p.code, p]),
  );
  const targetCodes = new Set(targetPortfolio.map((t) => t.code));

  const actions: RebalanceAction[] = [];

  for (const pos of account.positions) {
    if (!targetCodes.has(pos.code)) {
      actions.push({
        code: pos.code,
        name: pos.name,
        currentQuantity: pos.quantity,
        targetQuantity: 0,
        action: "SELL",
        orderQuantity: -pos.quantity,
        targetAmount: 0,
      });
    }
  }

  for (const target of targetPortfolio) {
    const current = currentMap.get(target.code);
    const currentQty = current?.quantity ?? 0;
    const diff = target.targetQuantity - currentQty;

    let action: RebalanceAction["action"];
    if (diff > 0) action = "BUY";
    else if (diff < 0) action = "SELL";
    else action = "HOLD";

    actions.push({
      code: target.code,
      name: target.name,
      currentQuantity: currentQty,
      targetQuantity: target.targetQuantity,
      action,
      orderQuantity: diff,
      targetAmount: target.targetAmount,
    });
  }

  const investmentAmount = account.totalAssets * (1 - config.cashRatio);

  return {
    marketId: config.marketId,
    quarter,
    executedAt: new Date().toISOString(),
    totalAssets: account.totalAssets,
    investmentAmount,
    cashTarget: account.totalAssets * config.cashRatio,
    actions,
  };
}
