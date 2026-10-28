import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createKisClient } from "../src/kis/client.js";

test("concurrent KIS requests respect the one-second production request interval", async () => {
  const cwd = process.cwd();
  const previousEnv = process.env.KIS_ENV;
  const directory = await mkdtemp(path.join(tmpdir(), "kis-rate-limit-"));

  try {
    process.chdir(directory);
    process.env.KIS_ENV = "prod";
    await writeFile(".token-cache.json", JSON.stringify({
      access_token: "test-token",
      expires_at: Date.now() + 60_000,
    }));

    const client = await createKisClient();
    const sentAt: number[] = [];
    await Promise.all(Array.from({ length: 3 }, () => client.get("/test", {
      adapter: async (config) => {
        sentAt.push(performance.now());
        return { config, data: {}, headers: {}, status: 200, statusText: "OK" };
      },
    })));

    for (let i = 1; i < sentAt.length; i++) {
      const interval = sentAt[i] - sentAt[i - 1];
      assert.ok(interval >= 980, `requests were only ${interval.toFixed(0)}ms apart`);
    }
  } finally {
    process.chdir(cwd);
    if (previousEnv === undefined) delete process.env.KIS_ENV;
    else process.env.KIS_ENV = previousEnv;
    await rm(directory, { recursive: true, force: true });
  }
});
