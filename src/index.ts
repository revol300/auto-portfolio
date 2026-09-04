import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { createKisClient } from "./kis/client.js";
import { createStrategy } from "./strategy/factory.js";
import type { MarketId } from "./strategy/types.js";
import { calculateTargetQuantities } from "./portfolio/positionSizing.js";
import { createRebalancePlan } from "./portfolio/rebalance.js";
import { printReport, saveReport } from "./report/report.js";
import { sweepProfit } from "./crypto/sweepProfit.js";

const program = new Command();

program
  .name("auto-portfolio")
  .description("한국/미국 주식 분기 리밸런싱 Batch 프로그램")
  .version("0.2.0");

program
  .command("rebalance")
  .description("리밸런싱 실행")
  .requiredOption("--market <market>", "시장 선택 (ko | us)")
  .option("--execute", "실제 주문 실행 (기본값: dry-run)")
  .option("--dry-run", "dry-run 모드 (기본값)")
  .option("--force", "주말/중복 검사 무시")
  .action(async (options) => {
    const marketId = options.market as MarketId;
    if (marketId !== "ko" && marketId !== "us") {
      console.error(`[Error] --market 옵션은 ko 또는 us만 가능합니다. (입력: ${options.market})`);
      process.exit(1);
    }

    const dryRun = !options.execute;
    const force = !!options.force;

    console.log(`[Mode] ${dryRun ? "DRY-RUN" : "EXECUTE"} | Market: ${marketId.toUpperCase()}`);

    const today = new Date();
    const quarter = `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`;

    if (!force && !dryRun) {
      const day = today.getDay();
      if (day === 0 || day === 6) {
        console.log("[Skip] 주말은 거래일이 아닙니다.");
        return;
      }

      const outputDir = path.join("output", marketId, quarter);
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir).filter((f) => /^\d{8}\.json$/.test(f));
        const todayMs = today.getTime();
        const hasDuplicate = files.some((f) => {
          const y = +f.slice(0, 4);
          const m = +f.slice(4, 6) - 1;
          const d = +f.slice(6, 8);
          const fileDate = new Date(y, m, d);
          return Math.abs(todayMs - fileDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
        });
        if (hasDuplicate) {
          console.log("[Skip] 7일 이내 실행 기록이 존재합니다. (--force 로 무시 가능)");
          return;
        }
      }
    }

    try {
      const client = await createKisClient();
      const strategy = createStrategy(marketId, client);
      const config = strategy.config;

      console.log(`[Start] ${quarter} 리밸런싱 시작 (${marketId.toUpperCase()})`);

      const account = await strategy.fetchAccountBalance();
      console.log(`[Account] 총 자산: ${account.totalAssets.toLocaleString()}`);

      if (account.totalAssets === 0) {
        console.error("[Error] 총 자산이 0입니다. 계좌 잔고를 확인하세요.");
        return;
      }

      const universe = await strategy.buildUniverse();
      const scoringData = await strategy.fetchScoringData(universe);
      const ranked = strategy.rankStocks(scoringData);

      const targetPortfolio = strategy.buildTargetPortfolio(
        ranked,
        account.positions,
        account.totalAssets,
      );

      const prices = await strategy.fetchPrices(targetPortfolio.map((t) => t.code));
      const sized = calculateTargetQuantities(targetPortfolio, prices);

      const plan = createRebalancePlan({
        account,
        targetPortfolio: sized,
        quarter,
        config,
      });

      printReport(plan);
      saveReport(plan, ranked, dryRun);

      if (!dryRun) {
        console.log("[Execute] 주문 실행 중...");
        const priceMap = new Map(prices.map((p) => [p.code, p.currentPrice]));
        await strategy.executeOrders(plan.actions, priceMap, new Map());
        console.log("[Execute] 주문 완료");
      }

      console.log("[Done] 리밸런싱 완료");
    } catch (error) {
      console.error("[Error]", error);
      process.exit(1);
    }
  });

program
  .command("sweep-profit")
  .description("바이낸스 선물 수익 절반을 현물 지갑으로 이체")
  .option("--execute", "실제 이체 실행 (기본값: dry-run)")
  .action(async (options) => {
    try {
      await sweepProfit({ execute: !!options.execute });
    } catch (error) {
      console.error("[Error]", error);
      process.exit(1);
    }
  });

program.parse();
