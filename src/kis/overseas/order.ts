import type { AxiosInstance } from "axios";
import type { RebalanceAction } from "../../types.js";
import { US_STRATEGY } from "../../strategy/us/config.js";

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

  // 거래소 누락으로 일부 주문만 실행되지 않도록 전체 주문을 먼저 검증한다.
  const orders = [...sells, ...buys].map((action) => {
    const exchange = toOrderExchange(action.code, exchangeMap.get(action.code));
    const side: "SELL" | "BUY" = action.action === "SELL" ? "SELL" : "BUY";
    return {
      accountNo,
      productCode,
      symbol: action.code,
      exchange,
      quantity: Math.abs(action.orderQuantity),
      price: priceMap.get(action.code) ?? 0,
      side,
    };
  });

  // TODO: 매도 체결 확인 후 매수 진행
  for (const order of orders) {
    await placeOverseasOrder(client, order);
  }
}

// 잔고의 주문 거래소 코드와 시세 조회 거래소 코드를 모두 허용한다.
function toOrderExchange(symbol: string, exchange: string | undefined): string {
  switch (exchange) {
    case "NAS":
    case "NASD":
      return "NASD";
    case "NYS":
    case "NYSE":
      return "NYSE";
    case "AMS":
    case "AMEX":
      return "AMEX";
    default:
      throw new Error(`Missing or unsupported exchange for ${symbol}: ${exchange ?? "unknown"}`);
  }
}

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
  if (!Number.isFinite(params.price) || params.price <= 0) {
    throw new Error(`Invalid current price for ${params.symbol}: ${params.price}`);
  }

  const trId = params.side === "BUY" ? "TTTT1002U" : "TTTT1006U";
  const orderExchange = params.exchange;
  const orderPrice = Math.round(
    params.price * (params.side === "BUY" ? US_STRATEGY.buyPriceBuffer : 0.95) * 100,
  ) / 100;

  const body: Record<string, string> = {
    CANO: params.accountNo.slice(0, 8),
    ACNT_PRDT_CD: params.productCode,
    OVRS_EXCG_CD: orderExchange,
    PDNO: params.symbol,
    ORD_DVSN: "00",
    ORD_QTY: String(params.quantity),
    OVRS_ORD_UNPR: orderPrice.toFixed(2),
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
    console.error(`[ORDER FAIL] ${params.side} ${params.symbol} x ${params.quantity} @ $${orderPrice.toFixed(2)} [${orderExchange}] — ${msg} (msg_cd=${res.data.msg_cd ?? "unknown"})`);
    return;
  }

  console.log(
    `[ORDER] ${params.side} ${params.symbol} x ${params.quantity} @ $${orderPrice.toFixed(2)} — ${msg}`,
  );
}
