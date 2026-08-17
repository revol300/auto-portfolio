import type { AxiosInstance } from "axios";
import type { KoFundamentals } from "../../strategy/ko/types.js";

export async function fetchFundamentals(
  client: AxiosInstance,
  code: string,
): Promise<KoFundamentals> {
  const res = await client.get(
    "/uapi/domestic-stock/v1/finance/financial-ratio",
    {
      headers: {
        tr_id: "FHKST66430300",
      },
      params: {
        FID_DIV_CLS_CODE: "0",
        fid_cond_mrkt_div_code: "J",
        fid_input_iscd: code,
      },
    },
  );

  // TODO: KIS API 응답 구조에 맞게 매핑 구현
  const data = res.data.output?.[0] ?? {};

  return {
    code,
    per: parseFloat(data.per) || null,
    pbr: parseFloat(data.pbr) || null,
    psr: parseFloat(data.psr) || null,
    pcr: parseFloat(data.pcr) || null,
    grossProfitToAssets: parseFloat(data.gpa) || null,
    roa: parseFloat(data.roa) || null,
    assetGrowth: parseFloat(data.asset_growth) || null,
    debtRatio: parseFloat(data.debt_ratio) || null,
    operatingProfitGrowthYoY: parseFloat(data.op_growth_yoy) || null,
    netIncomeGrowthYoY: parseFloat(data.ni_growth_yoy) || null,
  };
}

export async function fetchBulkFundamentals(
  client: AxiosInstance,
  codes: string[],
): Promise<KoFundamentals[]> {
  const results: KoFundamentals[] = [];
  for (const code of codes) {
    const data = await fetchFundamentals(client, code);
    results.push(data);
    // KIS API rate limit 대응
    await new Promise((r) => setTimeout(r, 100));
  }
  return results;
}
