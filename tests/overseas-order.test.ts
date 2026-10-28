import assert from "node:assert/strict";
import test, { beforeEach, afterEach } from "node:test";
import axios from "axios";
import { UsEvEbitdaStrategy } from "../src/strategy/us/strategy.js";
import { executeOverseasOrders } from "../src/kis/overseas/order.js";
import type { RebalanceAction } from "../src/types.js";

const previousAccount = process.env.KIS_US_ACCOUNT_NO;
beforeEach(() => { process.env.KIS_US_ACCOUNT_NO = "12345678"; });
afterEach(() => {
  if (previousAccount === undefined) delete process.env.KIS_US_ACCOUNT_NO;
  else process.env.KIS_US_ACCOUNT_NO = previousAccount;
});

const sell: RebalanceAction = {
  code: "ARCO", name: "Arcos Dorados", currentQuantity: 3,
  targetQuantity: 0, action: "SELL", orderQuantity: -3, targetAmount: 0,
};

function fixture(orderResponse = { rt_cd: "0", msg1: "OK", msg_cd: "OK" }) {
  const orders: unknown[] = [];
  const client = axios.create({
    adapter: async (config) => {
      let data: unknown;
      if (config.url?.endsWith("/inquire-balance")) {
        data = { output1: [{
          ovrs_pdno: "ARCO", ovrs_item_name: "Arcos Dorados",
          ovrs_cblc_qty: "3", now_pric2: "7.20", ovrs_stck_evlu_amt: "21.60",
          ovrs_excg_cd: "NYSE",
        }] };
      } else if (config.url?.endsWith("/inquire-psamount")) {
        data = { output: { ovrs_ord_psbl_amt: "100" } };
      } else {
        assert.equal(config.url, "/uapi/overseas-stock/v1/trading/order");
        assert.equal(typeof config.data, "string");
        orders.push(JSON.parse(config.data));
        data = orderResponse;
      }
      return { config, data, headers: {}, status: 200, statusText: "OK" };
    },
  });
  return { client, orders };
}

test("selling a held stock outside the universe preserves its balance exchange", async () => {
  const { client, orders } = fixture();
  const strategy = new UsEvEbitdaStrategy(client);
  await strategy.fetchAccountBalance();
  await strategy.executeOrders([sell], new Map([["ARCO", 7.20]]), new Map());
  assert.equal(orders.length, 1);
  assert.deepEqual(orders[0], {
    CANO: "12345678", ACNT_PRDT_CD: process.env.KIS_US_ACCOUNT_PRODUCT_CODE ?? "01",
    OVRS_EXCG_CD: "NYSE", PDNO: "ARCO", ORD_DVSN: "00", ORD_QTY: "3",
    OVRS_ORD_UNPR: "6.84", ORD_SVR_DVSN_CD: "0", SLL_TYPE: "00",
  });
});

test("missing or unsupported exchanges stop the batch before any order", async () => {
  for (const exchange of [undefined, "INVALID"]) {
    const { client, orders } = fixture();
    const exchangeMap = new Map([["AAPL", "NAS"]]);
    if (exchange !== undefined) exchangeMap.set("ARCO", exchange);
    await assert.rejects(executeOverseasOrders(
      client, [{ ...sell, code: "AAPL" }, sell],
      new Map([["AAPL", 100], ["ARCO", 7.20]]), exchangeMap,
    ), /exchange.*ARCO/i);
    assert.equal(orders.length, 0);
  }
});

test("order failures include the submitted exchange and KIS message code", async (t) => {
  const { client } = fixture({ rt_cd: "1", msg1: "해당종목정보가 없습니다.", msg_cd: "TEST_ERROR" });
  const log = t.mock.method(console, "error", () => {});
  await executeOverseasOrders(client, [sell], new Map([["ARCO", 7.20]]), new Map([["ARCO", "NYS"]]));
  assert.equal(log.mock.callCount(), 1);
  assert.match(String(log.mock.calls[0].arguments[0]), /NYSE/);
  assert.match(String(log.mock.calls[0].arguments[0]), /TEST_ERROR/);
});
