import { getDb } from "./database.js";
import type { RebalancePlan, FactorScores, Fundamentals } from "../types.js";

export async function hasRebalancedThisQuarter(quarter: string): Promise<boolean> {
  const row = await getDb()
    .selectFrom("rebalance_runs")
    .select("id")
    .where("quarter", "=", quarter)
    .where("status", "=", "completed")
    .executeTakeFirst();

  return !!row;
}

export async function saveRebalanceRun(plan: RebalancePlan): Promise<void> {
  const db = getDb();

  await db
    .insertInto("rebalance_runs")
    .values({
      id: plan.runId,
      quarter: plan.quarter,
      executed_at: plan.executedAt,
      total_assets: plan.totalAssets,
      investment_amount: plan.investmentAmount,
      cash_target: plan.cashTarget,
      status: "completed",
    })
    .execute();

  for (const action of plan.actions) {
    await db
      .insertInto("portfolios")
      .values({
        run_id: plan.runId,
        code: action.code,
        name: action.name,
        action: action.action,
        current_quantity: action.currentQuantity,
        target_quantity: action.targetQuantity,
        order_quantity: action.orderQuantity,
        target_amount: action.targetAmount,
      })
      .execute();
  }
}

export async function saveFactorScores(
  runId: string,
  scores: FactorScores[],
): Promise<void> {
  const db = getDb();

  for (const s of scores) {
    await db
      .insertInto("factor_scores")
      .values({
        run_id: runId,
        code: s.code,
        name: s.name,
        value_score: s.valueScore,
        quality_score: s.qualityScore,
        earnings_score: s.earningsScore,
        momentum_score: s.momentumScore,
        final_score: s.finalScore,
        rank: s.rank,
      })
      .execute();
  }
}

export async function saveFundamentalSnapshots(
  runId: string,
  fundamentals: Fundamentals[],
): Promise<void> {
  const db = getDb();

  for (const f of fundamentals) {
    await db
      .insertInto("fundamental_snapshots")
      .values({
        run_id: runId,
        code: f.code,
        per: f.per,
        pbr: f.pbr,
        psr: f.psr,
        pcr: f.pcr,
        gpa: f.grossProfitToAssets,
        roa: f.roa,
        asset_growth: f.assetGrowth,
        debt_ratio: f.debtRatio,
        op_growth_yoy: f.operatingProfitGrowthYoY,
        ni_growth_yoy: f.netIncomeGrowthYoY,
      })
      .execute();
  }
}
