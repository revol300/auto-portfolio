import type { AxiosInstance } from "axios";
import type { RebalanceAction } from "../../types.js";

export async function executeOverseasOrders(
  client: AxiosInstance,
  actions: RebalanceAction[],
): Promise<void> {
  const accountNo = process.env.KIS_US_ACCOUNT_NO!;
  const productCode = process.env.KIS_US_ACCOUNT_PRODUCT_CODE ?? "01";

  const sells = actions.filter((a) => a.action === "SELL");
  const buys = actions.filter((a) => a.action === "BUY");

  for (const action of sells) {
    await placeOverseasOrder(client, {
      accountNo,
      productCode,
      symbol: action.code,
      quantity: Math.abs(action.orderQuantity),
      side: "SELL",
    });
  }

  // TODO: 매도 체결 확인 후 매수 진행

  for (const action of buys) {
    await placeOverseasOrder(client, {
      accountNo,
      productCode,
      symbol: action.code,
      quantity: action.orderQuantity,
      side: "BUY",
    });
  }
}

async function placeOverseasOrder(
  client: AxiosInstance,
  params: {
    accountNo: string;
    productCode: string;
    symbol: string;
    quantity: number;
    side: "BUY" | "SELL";
  },
): Promise<void> {
  const trId = params.side === "BUY" ? "TTTT1002U" : "TTTT1001U";

  await client.post(
    "/uapi/overseas-stock/v1/trading/order",
    {
      CANO: params.accountNo.slice(0, 8),
      ACNT_PRDT_CD: params.productCode,
      OVRS_EXCG_CD: "NASD",
      PDNO: params.symbol,
      ORD_DVSN: "00", // 지정가 (해외주식은 시장가 미지원 거래소 있음)
      ORD_QTY: String(params.quantity),
      OVRS_ORD_UNPR: "0",
      SLL_TYPE: params.side === "SELL" ? "00" : "",
    },
    {
      headers: {
        tr_id: trId,
      },
    },
  );

  console.log(
    `[ORDER] ${params.side} ${params.symbol} x ${params.quantity}`,
  );
}
