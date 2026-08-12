import type { FactorScores, Position, TargetPortfolioItem } from "../types.js";
import { STRATEGY } from "../config/strategy.js";

interface BuildInput {
  scores: FactorScores[];
  currentPositions: Position[];
  totalAssets: number;
}

export function buildTargetPortfolio(input: BuildInput): TargetPortfolioItem[] {
  const { scores, currentPositions, totalAssets } = input;
  const currentCodes = new Set(currentPositions.map((p) => p.code));

  const selected: FactorScores[] = [];

  for (const score of scores) {
    if (selected.length >= STRATEGY.PORTFOLIO_SIZE) break;

    // 신규 진입: Rank 1~20
    if (score.rank <= STRATEGY.PORTFOLIO_SIZE) {
      selected.push(score);
      continue;
    }

    // 기존 보유 유지: Rank 1~30
    if (
      score.rank <= STRATEGY.HOLD_BUFFER_RANK &&
      currentCodes.has(score.code)
    ) {
      selected.push(score);
      continue;
    }
  }

  // Hold buffer로 인해 20개를 초과할 수 있으므로 score 순으로 상위 20개만
  const final = selected
    .sort((a, b) => a.rank - b.rank)
    .slice(0, STRATEGY.PORTFOLIO_SIZE);

  const investmentAmount = totalAssets * (1 - STRATEGY.CASH_RATIO);
  const perStockAmount = investmentAmount / STRATEGY.PORTFOLIO_SIZE;
  const perStockWeight = (1 - STRATEGY.CASH_RATIO) / STRATEGY.PORTFOLIO_SIZE;

  return final.map((s) => ({
    code: s.code,
    name: s.name,
    rank: s.rank,
    finalScore: s.finalScore,
    targetWeight: perStockWeight,
    targetAmount: perStockAmount,
    targetQuantity: 0, // positionSizing에서 계산
  }));
}
