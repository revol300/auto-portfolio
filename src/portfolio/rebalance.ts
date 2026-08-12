import type {
  AccountBalance,
  TargetPortfolioItem,
  RebalanceAction,
  RebalancePlan,
} from "../types.js";
import { STRATEGY } from "../config/strategy.js";

interface RebalanceInput {
  account: AccountBalance;
  targetPortfolio: TargetPortfolioItem[];
  quarter: string;
}

export function createRebalancePlan(input: RebalanceInput): RebalancePlan {
  const { account, targetPortfolio, quarter } = input;

  const currentMap = new Map(
    account.positions.map((p) => [p.code, p]),
  );
  const targetCodes = new Set(targetPortfolio.map((t) => t.code));

  const actions: RebalanceAction[] = [];

  // 매도 대상: 현재 보유 중이지만 target에 없는 종목
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

  // 매수/유지 대상
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

  const investmentAmount = account.totalAssets * (1 - STRATEGY.CASH_RATIO);

  return {
    runId: generateRunId(),
    quarter,
    executedAt: new Date().toISOString(),
    totalAssets: account.totalAssets,
    investmentAmount,
    cashTarget: account.totalAssets * STRATEGY.CASH_RATIO,
    actions,
  };
}

function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
