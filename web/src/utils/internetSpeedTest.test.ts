import { afterEach, describe, expect, it, vi } from "vitest";

import { testInternetSpeed } from "@/utils/internetSpeedTest";

describe("testInternetSpeed", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fails instead of hanging when every endpoint stops responding", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      ),
    );

    const pending = testInternetSpeed();
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.passed).toBe(false);
    expect(result.ping).toBe(999);
  });
});
