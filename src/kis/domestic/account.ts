import type { AxiosInstance } from "axios";
import type { AccountBalance, Position } from "../../types.js";

export async function fetchAccountBalance(
  client: AxiosInstance,
): Promise<AccountBalance> {
  const accountNo = process.env.KIS_KO_ACCOUNT_NO ?? process.env.KIS_ACCOUNT_NO;
  const productCode = process.env.KIS_KO_ACCOUNT_PRODUCT_CODE ?? process.env.KIS_ACCOUNT_PRODUCT_CODE ?? "01";

  if (!accountNo) {
    throw new Error("KIS_KO_ACCOUNT_NO 환경변수를 설정하세요.");
  }

  const res = await client.get(
    "/uapi/domestic-stock/v1/trading/inquire-balance",
    {
      headers: {
        tr_id: "TTTC8434R",
      },
      params: {
        CANO: accountNo.slice(0, 8),
        ACNT_PRDT_CD: productCode,
        AFHR_FLPR_YN: "N",
        OFL_YN: "",
        INQR_DVSN: "02",
        UNPR_DVSN: "01",
        FUND_STTL_ICLD_YN: "N",
        FNCG_AMT_AUTO_RDPT_YN: "N",
        PRCS_DVSN: "01",
        CTX_AREA_FK100: "",
        CTX_AREA_NK100: "",
      },
    },
  );

  const output1: Record<string, string>[] = res.data.output1 ?? [];
  const output2 = res.data.output2?.[0] ?? {};

  const positions: Position[] = output1
    .filter((item) => Number(item.hldg_qty) > 0)
    .map((item) => ({
      code: item.pdno ?? "",
      name: item.prdt_name ?? "",
      quantity: Number(item.hldg_qty ?? 0),
      currentPrice: Number(item.prpr ?? 0),
      evaluationAmount: Number(item.evlu_amt ?? 0),
    }));

  return {
    totalAssets: Number(output2.tot_evlu_amt ?? 0),
    cashBalance: Number(output2.dnca_tot_amt ?? 0),
    positions,
  };
}
