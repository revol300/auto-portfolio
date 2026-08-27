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

  const cano = accountNo.slice(0, 8);

  // 1) 해외주식 잔고 조회 (보유종목)
  const balanceRes = await client.get(
    "/uapi/overseas-stock/v1/trading/inquire-balance",
    {
      headers: {
        tr_id: "TTTS3012R",
      },
      params: {
        CANO: cano,
        ACNT_PRDT_CD: productCode,
        OVRS_EXCG_CD: "NASD",
        TR_CRCY_CD: "USD",
        CTX_AREA_FK200: "",
        CTX_AREA_NK200: "",
      },
    },
  );

  const output1: Record<string, string>[] = balanceRes.data.output1 ?? [];

  const positions: Position[] = output1
    .filter((item) => Number(item.ovrs_cblc_qty) > 0)
    .map((item) => ({
      code: item.ovrs_pdno ?? "",
      name: item.ovrs_item_name ?? "",
      quantity: Number(item.ovrs_cblc_qty ?? 0),
      currentPrice: Number(item.now_pric2 ?? 0),
      evaluationAmount: Number(item.ovrs_stck_evlu_amt ?? 0),
    }));

  // 2) 해외주식 매수가능금액 조회 (USD 현금 잔고)
  const buyableRes = await client.get(
    "/uapi/overseas-stock/v1/trading/inquire-psamount",
    {
      headers: {
        tr_id: "TTTS3007R",
      },
      params: {
        CANO: cano,
        ACNT_PRDT_CD: productCode,
        OVRS_EXCG_CD: "NASD",
        OVRS_ORD_UNPR: "1",
        ITEM_CD: "AAPL",
      },
    },
  );

  const buyableOutput = buyableRes.data.output ?? {};
  const cashBalance = Number(buyableOutput.ovrs_ord_psbl_amt ?? 0);

  const positionTotal = positions.reduce((sum, p) => sum + p.evaluationAmount, 0);
  const totalAssets = positionTotal + cashBalance;

  return {
    totalAssets,
    cashBalance,
    positions,
  };
}
