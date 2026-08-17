import type { AxiosInstance } from "axios";
import type { RebalanceAction } from "../../types.js";

export async function executeOrders(
  client: AxiosInstance,
  actions: RebalanceAction[],
): Promise<void> {
  const accountNo = process.env.KIS_KO_ACCOUNT_NO ?? process.env.KIS_ACCOUNT_NO!;
  const productCode = process.env.KIS_KO_ACCOUNT_PRODUCT_CODE ?? process.env.KIS_ACCOUNT_PRODUCT_CODE ?? "01";

  const sells = actions.filter((a) => a.action === "SELL");
  const buys = actions.filter((a) => a.action === "BUY");

  // 매도 먼저 실행
  for (const action of sells) {
    await placeOrder(client, {
      accountNo,
      productCode,
      code: action.code,
      quantity: Math.abs(action.orderQuantity),
      side: "SELL",
    });
    await new Promise((r) => setTimeout(r, 500));
  }

  // TODO: 매도 체결 확인 후 매수 진행
  // 현재는 순차적으로 실행

  for (const action of buys) {
    await placeOrder(client, {
      accountNo,
      productCode,
      code: action.code,
      quantity: action.orderQuantity,
      side: "BUY",
    });
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function placeOrder(
  client: AxiosInstance,
  params: {
    accountNo: string;
    productCode: string;
    code: string;
    quantity: number;
    side: "BUY" | "SELL";
  },
): Promise<void> {
  const trId = params.side === "BUY" ? "VTTC0802U" : "VTTC0801U";

  await client.post(
    "/uapi/domestic-stock/v1/trading/order-cash",
    {
      CANO: params.accountNo.slice(0, 8),
      ACNT_PRDT_CD: params.productCode,
      PDNO: params.code,
      ORD_DVSN: "01", // 시장가
      ORD_QTY: String(params.quantity),
      ORD_UNPR: "0",
    },
    {
      headers: {
        tr_id: trId,
      },
    },
  );

  console.log(
    `[ORDER] ${params.side} ${params.code} x ${params.quantity}`,
  );
}
