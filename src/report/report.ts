import fs from "node:fs";
import path from "node:path";
import type { RebalancePlan } from "../types.js";
import type { RankedStock } from "../strategy/types.js";

export function printReport(plan: RebalancePlan): void {
  console.log("\n========================================");
  console.log(`  리밸런싱 결과 — ${plan.quarter} [${plan.marketId.toUpperCase()}]`);
  console.log("========================================");
  console.log(`  총 자산:     ${fmt(plan.totalAssets)}`);
  console.log(`  투자 금액:   ${fmt(plan.investmentAmount)}`);
  console.log(`  현금 목표:   ${fmt(plan.cashTarget)}`);
  console.log("----------------------------------------");

  const buys = plan.actions.filter((a) => a.action === "BUY");
  const sells = plan.actions.filter((a) => a.action === "SELL");
  const holds = plan.actions.filter((a) => a.action === "HOLD");

  console.log(`  매수: ${buys.length}  |  매도: ${sells.length}  |  유지: ${holds.length}`);
  console.log("----------------------------------------");

  console.log("\n  [종목]           [현재] [목표] [Action] [주문수량]");
  for (const a of plan.actions) {
    const qty = a.orderQuantity > 0 ? `+${a.orderQuantity}` : String(a.orderQuantity);
    console.log(
      `  ${a.name.padEnd(16)} ${String(a.currentQuantity).padStart(5)} ${String(a.targetQuantity).padStart(5)}  ${a.action.padEnd(5)}   ${qty.padStart(6)}`,
    );
  }
  console.log("========================================\n");
}

export function saveReport(
  plan: RebalancePlan,
  ranked: RankedStock[],
  dryRun: boolean,
): void {
  const base = path.join("output", plan.marketId, plan.quarter);
  const outputDir = dryRun ? path.join(base, "dry-run") : base;
  fs.mkdirSync(outputDir, { recursive: true });

  // YYYYMMDD.json
  const dateStr = plan.executedAt.slice(0, 10).replace(/-/g, "");
  fs.writeFileSync(
    path.join(outputDir, `${dateStr}.json`),
    JSON.stringify(plan, null, 2),
  );

  // ranking.csv
  const detailKeys = ranked.length > 0 ? Object.keys(ranked[0].scoringDetails) : [];
  const rankingHeader = ["rank", "code", "name", ...detailKeys, "score"].join(",");
  const rankingRows = ranked
    .slice(0, 50)
    .map(
      (s) =>
        [s.rank, s.code, s.name, ...detailKeys.map((k) => r(s.scoringDetails[k] ?? 0)), r(s.score)].join(","),
    );
  fs.writeFileSync(
    path.join(outputDir, "ranking.csv"),
    [rankingHeader, ...rankingRows].join("\n"),
  );

  // target-portfolio.csv
  const tpHeader = "code,name,targetAmount";
  const tpRows = plan.actions
    .filter((a) => a.action !== "SELL" || a.targetQuantity > 0)
    .map((a) => `${a.code},${a.name},${a.targetAmount}`);
  fs.writeFileSync(
    path.join(outputDir, "target-portfolio.csv"),
    [tpHeader, ...tpRows].join("\n"),
  );

  // rebalance.csv
  const rbHeader = "종목,현재,목표,Action,주문수량";
  const rbRows = plan.actions.map(
    (a) =>
      `${a.name},${a.currentQuantity},${a.targetQuantity},${a.action},${a.orderQuantity > 0 ? "+" : ""}${a.orderQuantity}`,
  );
  fs.writeFileSync(
    path.join(outputDir, "rebalance.csv"),
    [rbHeader, ...rbRows].join("\n"),
  );

  console.log(`[Report] 결과 저장: ${outputDir}/`);
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function r(n: number): string {
  return n.toFixed(4);
}
