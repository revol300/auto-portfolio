import fs from "node:fs";
import path from "node:path";
import type { RebalancePlan } from "../types.js";
import type { RankedStock } from "../strategy/types.js";

export function printReport(plan: RebalancePlan, priceMap: Map<string, number>): void {
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

  const isUs = plan.marketId === "us";
  const nameWidth = 28;
  const currentWidth = 6;
  const targetWidth = 6;
  const actionWidth = 8;
  const quantityWidth = 10;
  const priceWidth = 10;

  console.log(
    `\n  ${padDisplay("[종목]", nameWidth)} ${padDisplay("[현재]", currentWidth, "right")} ${padDisplay("[목표]", targetWidth, "right")} ${padDisplay("[Action]", actionWidth)} ${padDisplay("[주문수량]", quantityWidth, "right")}${isUs ? ` ${padDisplay("[주당단가]", priceWidth, "right")}` : ""}`,
  );
  for (const a of plan.actions) {
    const qty = a.orderQuantity > 0 ? `+${a.orderQuantity}` : String(a.orderQuantity);
    const unitPrice = isUs ? `$${formatUnitPrice(priceMap.get(a.code))}` : "";
    console.log(
      `  ${padDisplay(a.name, nameWidth)} ${padDisplay(String(a.currentQuantity), currentWidth, "right")} ${padDisplay(String(a.targetQuantity), targetWidth, "right")} ${padDisplay(a.action, actionWidth)} ${padDisplay(qty, quantityWidth, "right")}${isUs ? ` ${padDisplay(unitPrice, priceWidth, "right")}` : ""}`,
    );
  }
  console.log("========================================\n");
}

export function saveReport(
  plan: RebalancePlan,
  ranked: RankedStock[],
  dryRun: boolean,
  priceMap: Map<string, number>,
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
    .map((a) => [a.code, a.name, a.targetAmount].map(csvField).join(","));
  fs.writeFileSync(
    path.join(outputDir, "target-portfolio.csv"),
    [tpHeader, ...tpRows].join("\n"),
  );

  // rebalance.csv
  const isUs = plan.marketId === "us";
  const rbHeader = `종목,현재,목표,Action,주문수량${isUs ? ",주당단가" : ""}`;
  const rbRows = plan.actions.map(
    (a) => [
      a.name,
      a.currentQuantity,
      a.targetQuantity,
      a.action,
      `${a.orderQuantity > 0 ? "+" : ""}${a.orderQuantity}`,
      ...(isUs ? [formatUnitPrice(priceMap.get(a.code))] : []),
    ].map(csvField).join(","),
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

function formatUnitPrice(price: number | undefined): string {
  return typeof price === "number" && Number.isFinite(price) && price > 0
    ? price.toFixed(2)
    : "";
}

function csvField(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function padDisplay(value: string, width: number, align: "left" | "right" = "left"): string {
  const text = truncateDisplay(value, width);
  const padding = " ".repeat(Math.max(0, width - displayWidth(text)));
  return align === "right" ? padding + text : text + padding;
}

function truncateDisplay(value: string, width: number): string {
  if (displayWidth(value) <= width) return value;
  if (width <= 1) return "…";

  let result = "";
  let used = 0;
  for (const char of value) {
    const charWidth = displayWidth(char);
    if (used + charWidth > width - 1) break;
    result += char;
    used += charWidth;
  }
  return `${result}…`;
}

function displayWidth(value: string): number {
  return [...value].reduce((width, char) => width + (isWideCharacter(char) ? 2 : 1), 0);
}

function isWideCharacter(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

function r(n: number): string {
  return n.toFixed(4);
}
