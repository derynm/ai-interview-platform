import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HardwareCheck from "@/components/HardwareCheck";
import { testInternetSpeed, type InternetSpeedResult } from "@/utils/internetSpeedTest";

vi.mock("@/utils/internetSpeedTest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/internetSpeedTest")>()),
  testInternetSpeed: vi.fn(),
}));

const speedResult = (passed: boolean): InternetSpeedResult => ({
  download: passed ? 20 : 1,
  upload: passed ? 10 : 1,
  ping: 50,
  passed,
  downloadTests: [],
  uploadTests: [],
  pingTests: [],
});

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn();
  createOscillator() {
    return {
      connect: vi.fn(),
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return { connect: vi.fn(), gain: { setValueAtTime: vi.fn() } };
  }
  createMediaStreamSource() {
    throw new Error("not available in jsdom");
  }
}

describe("HardwareCheck", () => {
  beforeEach(() => {
    vi.stubGlobal("AudioContext", FakeAudioContext);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(testInternetSpeed).mockReset();
  });

  it("re-runs every check after Retry instead of hanging on OS & browser", async () => {
    vi.mocked(testInternetSpeed)
      .mockResolvedValueOnce(speedResult(false))
      .mockResolvedValueOnce(speedResult(true));
    const user = userEvent.setup();

    render(<HardwareCheck />);

    const retry = await screen.findByRole("button", { name: /retry/i }, { timeout: 3000 });
    await user.click(retry);

    await waitFor(
      () => expect(screen.getByRole("button", { name: "Start Interview" })).toBeEnabled(),
      { timeout: 3000 },
    );
    expect(screen.queryByText("Checking...")).not.toBeInTheDocument();
    expect(screen.getAllByText("Passed")).toHaveLength(4);
    expect(testInternetSpeed).toHaveBeenCalledTimes(2);
  });
});
