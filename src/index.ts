import "dotenv/config";
import { Command } from "commander";
import { createKisClient } from "./kis/client.js";
import { fetchAccountBalance } from "./kis/account.js";
import { buildUniverse } from "./universe/buildUniverse.js";
import { fetchBulkDartFundamentals } from "./dart/finance.js";
import { fetchBulkPrices } from "./kis/price.js";
import { calculateFactorScores } from "./factors/finalScore.js";
import { buildTargetPortfolio } from "./portfolio/buildPortfolio.js";
import { calculateTargetQuantities } from "./portfolio/positionSizing.js";
import { createRebalancePlan } from "./portfolio/rebalance.js";
import { isRebalanceMonth, isLastTradingDay, getQuarterLabel } from "./scheduler/tradingDay.js";
import { alreadyRebalanced } from "./scheduler/duplicateGuard.js";
import { initializeDatabase } from "./storage/database.js";
import { saveRebalanceRun, saveFactorScores, saveFundamentalSnapshots } from "./storage/repository.js";
import { printReport, saveReport } from "./report/report.js";
import { executeOrders } from "./kis/order.js";

const program = new Command();

program
  .name("ko-rebalance")
  .description("한국주식 멀티팩터 ISA 분기 리밸런싱")
  .version("0.1.0");

program
  .command("rebalance")
  .description("리밸런싱 실행")
  .option("--execute", "실제 주문 실행 (기본값: dry-run)")
  .option("--dry-run", "dry-run 모드 (기본값)")
  .option("--force", "날짜/중복 검사 무시")
  .action(async (options) => {
    const dryRun = !options.execute;
    const force = !!options.force;

    console.log(`[Mode] ${dryRun ? "DRY-RUN" : "EXECUTE"}`);

    try {
      await initializeDatabase();

      const today = new Date();
      const quarter = getQuarterLabel(today);

      if (!force) {
        if (!isRebalanceMonth(today)) {
          console.log(`[Skip] ${today.getMonth() + 1}월은 리밸런싱 월이 아닙니다.`);
          return;
        }

        if (!(await isLastTradingDay(today))) {
          console.log("[Skip] 마지막 거래일이 아닙니다.");
          return;
        }

        if (await alreadyRebalanced(quarter)) {
          console.log(`[Skip] ${quarter} 리밸런싱이 이미 완료되었습니다.`);
          return;
        }
      }

      console.log(`[Start] ${quarter} 리밸런싱 시작`);

      const client = await createKisClient();
      const account = await fetchAccountBalance(client);
      console.log(`[Account] 총 자산: ${account.totalAssets.toLocaleString()}원`);

      const universe = await buildUniverse(client);
      const codes = universe.map((s) => s.code);
      const names = new Map(universe.map((s) => [s.code, s.name]));

      console.log("[Data] 가격 데이터 조회 중...");
      const prices = await fetchBulkPrices(client, codes);

      const priceMap = new Map(prices.map((p) => [p.code, p]));

      console.log(`[Data] 재무 데이터 조회 중 (DART)... (${codes.length}종목)`);
      const dartStocks = universe.map((s) => ({
        code: s.code,
        currentPrice: priceMap.get(s.code)?.currentPrice ?? 0,
        sharesOutstanding: Math.floor(s.marketCap / (priceMap.get(s.code)?.currentPrice || 1)),
      }));
      const fundamentals = await fetchBulkDartFundamentals(dartStocks);

      console.log("[Factor] 팩터 스코어 계산 중...");
      const scores = calculateFactorScores({ fundamentals, prices, names });

      const targetPortfolio = buildTargetPortfolio({
        scores,
        currentPositions: account.positions,
        totalAssets: account.totalAssets,
      });

      const sized = calculateTargetQuantities(targetPortfolio, prices);

      const plan = createRebalancePlan({
        account,
        targetPortfolio: sized,
        quarter,
      });

      printReport(plan);
      saveReport(plan, scores);

      await saveRebalanceRun(plan);
      await saveFactorScores(plan.runId, scores);
      await saveFundamentalSnapshots(plan.runId, fundamentals);

      if (!dryRun) {
        console.log("[Execute] 주문 실행 중...");
        await executeOrders(client, plan.actions);
        console.log("[Execute] 주문 완료");
      }

      console.log("[Done] 리밸런싱 완료");
    } catch (error) {
      console.error("[Error]", error);
      process.exit(1);
    }
  });

program.parse();
