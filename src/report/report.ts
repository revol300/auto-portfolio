import fs from "node:fs";
import path from "node:path";
import type { RebalancePlan, FactorScores } from "../types.js";

export function printReport(plan: RebalancePlan): void {
  console.log("\n========================================");
  console.log(`  리밸런싱 결과 — ${plan.quarter}`);
  console.log("========================================");
  console.log(`  총 자산:     ${fmt(plan.totalAssets)}원`);
  console.log(`  투자 금액:   ${fmt(plan.investmentAmount)}원`);
  console.log(`  현금 목표:   ${fmt(plan.cashTarget)}원`);
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
  scores: FactorScores[],
): void {
  const outputDir = path.join("output", plan.quarter);
  fs.mkdirSync(outputDir, { recursive: true });

  // result.json
  fs.writeFileSync(
    path.join(outputDir, "result.json"),
    JSON.stringify(plan, null, 2),
  );

  // ranking.csv
  const rankingHeader = "rank,code,name,value,quality,earnings,momentum,final";
  const rankingRows = scores
    .slice(0, 50)
    .map(
      (s) =>
        `${s.rank},${s.code},${s.name},${r(s.valueScore)},${r(s.qualityScore)},${r(s.earningsScore)},${r(s.momentumScore)},${r(s.finalScore)}`,
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
