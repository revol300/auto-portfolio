import type { AxiosInstance } from "axios";
import type { AccountBalance, Position } from "../../types.js";

export async function fetchOverseasAccountBalance(
  client: AxiosInstance,
): Promise<AccountBalance> {
  const accountNo = process.env.KIS_US_ACCOUNT_NO;
  const productCode = process.env.KIS_US_ACCOUNT_PRODUCT_CODE ?? "01";

  if (!accountNo) {
    throw new Error("KIS_US_ACCOUNT_NO 환경변수를 설정하세요.");
  }

  const res = await client.get(
    "/uapi/overseas-stock/v1/trading/inquire-balance",
    {
      headers: {
        tr_id: "TTTS3012R",
      },
      params: {
        CANO: accountNo.slice(0, 8),
        ACNT_PRDT_CD: productCode,
        OVRS_EXCG_CD: "NASD",
        TR_CRCY_CD: "USD",
        CTX_AREA_FK200: "",
        CTX_AREA_NK200: "",
      },
    },
  );

  // TODO: KIS 해외주식 잔고 조회 응답 구조에 맞게 매핑
  const output1: Record<string, string>[] = res.data.output1 ?? [];
  const output2 = res.data.output2?.[0] ?? {};

  const positions: Position[] = output1
    .filter((item) => Number(item.ovrs_cblc_qty) > 0)
    .map((item) => ({
      code: item.ovrs_pdno ?? "",
      name: item.ovrs_item_name ?? "",
      quantity: Number(item.ovrs_cblc_qty ?? 0),
      currentPrice: Number(item.now_pric2 ?? 0),
      evaluationAmount: Number(item.ovrs_stck_evlu_amt ?? 0),
    }));

  return {
    totalAssets: Number(output2.tot_evlu_pfls_amt ?? 0),
    cashBalance: Number(output2.frcr_pchs_amt1 ?? 0),
    positions,
  };
}
