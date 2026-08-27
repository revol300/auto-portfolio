import type { AxiosInstance } from "axios";
import type { RebalanceAction } from "../../types.js";

export async function executeOverseasOrders(
  client: AxiosInstance,
  actions: RebalanceAction[],
  priceMap: Map<string, number>,
  exchangeMap: Map<string, string>,
): Promise<void> {
  const accountNo = process.env.KIS_US_ACCOUNT_NO!;
  const productCode = process.env.KIS_US_ACCOUNT_PRODUCT_CODE ?? "01";

  const sells = actions.filter((a) => a.action === "SELL");
  const buys = actions.filter((a) => a.action === "BUY");

  for (const action of sells) {
    const price = priceMap.get(action.code) ?? 0;
    const exchange = exchangeMap.get(action.code) ?? "NASD";
    await placeOverseasOrder(client, {
      accountNo,
      productCode,
      symbol: action.code,
      exchange,
      quantity: Math.abs(action.orderQuantity),
      price,
      side: "SELL",
    });
  }

  // TODO: 매도 체결 확인 후 매수 진행

  for (const action of buys) {
    const price = priceMap.get(action.code) ?? 0;
    const exchange = exchangeMap.get(action.code) ?? "NASD";
    await placeOverseasOrder(client, {
      accountNo,
      productCode,
      symbol: action.code,
      exchange,
      quantity: action.orderQuantity,
      price,
      side: "BUY",
    });
  }
}

// KIS 가격 조회 거래소 코드 → 주문 거래소 코드 변환
const ORDER_EXCHANGE_MAP: Record<string, string> = {
  NAS: "NASD",
  NYS: "NYSE",
  AMS: "AMEX",
};

async function placeOverseasOrder(
  client: AxiosInstance,
  params: {
    accountNo: string;
    productCode: string;
    symbol: string;
    exchange: string;
    quantity: number;
    price: number;
    side: "BUY" | "SELL";
  },
): Promise<void> {
  const trId = params.side === "BUY" ? "TTTT1002U" : "TTTT1006U";
  const orderExchange = ORDER_EXCHANGE_MAP[params.exchange] ?? params.exchange;

  const body: Record<string, string> = {
    CANO: params.accountNo.slice(0, 8),
    ACNT_PRDT_CD: params.productCode,
    OVRS_EXCG_CD: orderExchange,
    PDNO: params.symbol,
    ORD_DVSN: "00",
    ORD_QTY: String(params.quantity),
    OVRS_ORD_UNPR: params.price.toFixed(2),
    ORD_SVR_DVSN_CD: "0",
  };

  if (params.side === "SELL") {
    body.SLL_TYPE = "00";
  }

  const res = await client.post(
    "/uapi/overseas-stock/v1/trading/order",
    body,
    {
      headers: {
        tr_id: trId,
      },
    },
  );

  const rtCd = res.data.rt_cd;
  const msg = res.data.msg1?.trim() ?? "";

  if (rtCd !== "0") {
    console.error(`[ORDER FAIL] ${params.side} ${params.symbol} x ${params.quantity} @ $${params.price.toFixed(2)} — ${msg}`);
    return;
  }

  console.log(
    `[ORDER] ${params.side} ${params.symbol} x ${params.quantity} @ $${params.price.toFixed(2)} — ${msg}`,
  );
}
