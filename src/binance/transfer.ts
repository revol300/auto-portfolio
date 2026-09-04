import { createSpotClient } from "./client.js";

interface TransferResponse {
  tranId: number;
}

export async function transferFuturesToSpot(amount: number): Promise<number> {
  const client = createSpotClient();
  const res = await client.post<TransferResponse>("/sapi/v1/asset/transfer", null, {
    params: {
      type: "UMFUTURE_MAIN",
      asset: "USDT",
      amount: amount.toFixed(2),
    },
  });
  return res.data.tranId;
}
