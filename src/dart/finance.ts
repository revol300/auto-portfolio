import { getDartClient } from "./client.js";
import type { Fundamentals } from "../types.js";

interface DartAccount {
  account_nm: string;
  thstrm_amount: string;
  frmtrm_amount: string;
  bfefrmtrm_amount: string;
  sj_nm: string;
}

import { fetchCorpCodeMap } from "./corpCode.js";

export async function fetchDartFinancials(
  corpCode: string,
  year: number,
): Promise<DartAccount[]> {
  const client = getDartClient();

  const res = await client.get("/fnlttSinglAcnt.json", {
    params: {
      corp_code: corpCode,
      bsns_year: String(year),
      reprt_code: "11011", // 사업보고서 (연간)
      fs_div: "CFS", // 연결재무제표
    },
  });

  if (res.data.status !== "000") {
    return [];
  }

  return res.data.list ?? [];
}

export async function buildFundamentalsFromDart(
  corpCode: string,
  stockCode: string,
  currentPrice: number,
  sharesOutstanding: number,
): Promise<Fundamentals> {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
  const prevYear = year - 1;

  const accounts = await fetchDartFinancials(corpCode, year);
  const prevAccounts = await fetchDartFinancials(corpCode, prevYear);

  const get = (list: DartAccount[], name: string): number | null => {
    const item = list.find((a) => a.account_nm === name && a.sj_nm === "손익계산서")
      ?? list.find((a) => a.account_nm === name);
    if (!item) return null;
    const val = Number(item.thstrm_amount?.replace(/,/g, ""));
    return isNaN(val) ? null : val;
  };

  const getBS = (list: DartAccount[], name: string): number | null => {
    const item = list.find((a) => a.account_nm === name && a.sj_nm === "재무상태표")
      ?? list.find((a) => a.account_nm === name);
    if (!item) return null;
    const val = Number(item.thstrm_amount?.replace(/,/g, ""));
    return isNaN(val) ? null : val;
  };

  const revenue = get(accounts, "매출액") ?? get(accounts, "수익(매출액)");
  const grossProfit = get(accounts, "매출총이익");
  const operatingProfit = get(accounts, "영업이익");
  const netIncome = get(accounts, "당기순이익") ?? get(accounts, "당기순이익(손실)");
  const totalAssets = getBS(accounts, "자산총계");
  const totalLiabilities = getBS(accounts, "부채총계");
  const totalEquity = getBS(accounts, "자본총계");

  const prevTotalAssets = getBS(prevAccounts, "자산총계");
  const prevOperatingProfit = get(prevAccounts, "영업이익");
  const prevNetIncome = get(prevAccounts, "당기순이익") ?? get(prevAccounts, "당기순이익(손실)");

  const marketCap = currentPrice * sharesOutstanding;

  // PER = 시가총액 / 당기순이익
  const per = netIncome && netIncome > 0 ? marketCap / netIncome : null;

  // PBR = 시가총액 / 자본총계
  const pbr = totalEquity && totalEquity > 0 ? marketCap / totalEquity : null;

  // PSR = 시가총액 / 매출액
  const psr = revenue && revenue > 0 ? marketCap / revenue : null;

  // PCR = 시가총액 / 영업활동현금흐름 (간이: 영업이익 사용)
  const pcr = operatingProfit && operatingProfit > 0 ? marketCap / operatingProfit : null;

  // GP/A = 매출총이익 / 자산총계
  const gpa = grossProfit && totalAssets ? grossProfit / totalAssets : null;

  // ROA = 당기순이익 / 자산총계
  const roa = netIncome && totalAssets ? netIncome / totalAssets : null;

  // Asset Growth = (당기 자산 - 전기 자산) / 전기 자산
  const assetGrowth =
    totalAssets && prevTotalAssets && prevTotalAssets > 0
      ? (totalAssets - prevTotalAssets) / prevTotalAssets
      : null;

  // Debt Ratio = 부채총계 / 자산총계
  const debtRatio =
    totalLiabilities && totalAssets ? totalLiabilities / totalAssets : null;

  // 영업이익 YoY
  const opGrowth =
    operatingProfit && prevOperatingProfit && prevOperatingProfit > 0
      ? (operatingProfit - prevOperatingProfit) / Math.abs(prevOperatingProfit)
      : null;

  // 순이익 YoY
  const niGrowth =
    netIncome && prevNetIncome && prevNetIncome > 0
      ? (netIncome - prevNetIncome) / Math.abs(prevNetIncome)
      : null;

  return {
    code: stockCode,
    per,
    pbr,
    psr,
    pcr,
    grossProfitToAssets: gpa,
    roa,
    assetGrowth,
    debtRatio,
    operatingProfitGrowthYoY: opGrowth,
    netIncomeGrowthYoY: niGrowth,
  };
}

export async function fetchBulkDartFundamentals(
  stocks: { code: string; currentPrice: number; sharesOutstanding: number }[],
): Promise<Fundamentals[]> {
  const corpCodeMap = await fetchCorpCodeMap();
  const results: Fundamentals[] = [];

  for (const stock of stocks) {
    const corpCode = corpCodeMap.get(stock.code);
    if (!corpCode) {
      console.warn(`[DART] corp_code 없음: ${stock.code} — 건너뜀`);
      continue;
    }

    const data = await buildFundamentalsFromDart(
      corpCode,
      stock.code,
      stock.currentPrice,
      stock.sharesOutstanding,
    );
    results.push(data);
    // DART API rate limit 대응 (일 10,000건)
    await new Promise((r) => setTimeout(r, 150));
  }

  return results;
}
