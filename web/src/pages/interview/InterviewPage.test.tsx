import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import InterviewPage from "@/pages/interview/InterviewPage";
import { useAudioWebSocket } from "@/hooks/useAudioWebSocket";
import { sessionsApi } from "@/services/sessions";
import type { CandidateInfo } from "@/types";

vi.mock("@/services/sessions", () => ({
  sessionsApi: { getCandidateInfo: vi.fn(), audioComplete: vi.fn() },
}));

vi.mock("@/hooks/useAudioWebSocket", () => ({ useAudioWebSocket: vi.fn() }));

vi.mock("@/hooks/useAudioPlayback", () => ({
  useAudioPlayback: () => ({
    playChunk: vi.fn(),
    stop: vi.fn(),
    scheduleAfterPlayback: vi.fn(),
    waitForDrain: vi.fn(),
    cancelDrain: vi.fn(),
  }),
}));

const startCapture = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAudioCapture", () => ({
  useAudioCapture: () => ({ start: startCapture, stop: vi.fn(), mute: vi.fn(), unmute: vi.fn() }),
}));

vi.mock("@/components/HardwareCheck", () => ({
  default: ({ onStart }: { onStart?: () => void }) => (
    <button onClick={onStart}>Hardware checks done</button>
  ),
}));

function httpError(status?: number) {
  const config = { headers: new AxiosHeaders() };
  if (!status) return new AxiosError("Network Error", "ERR_NETWORK", config);
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: {},
  });
}

type SocketOptions = Parameters<typeof useAudioWebSocket>[0];

const connect = vi.fn();

function renderPage() {
  let options: SocketOptions | undefined;
  vi.mocked(useAudioWebSocket).mockImplementation((opts) => {
    options = opts;
    return {
      connect,
      send: vi.fn(),
      sendJson: vi.fn(),
      disconnect: vi.fn(),
      connectionState: "disconnected",
    };
  });

  render(
    <MemoryRouter initialEntries={["/interview/invite-token"]}>
      <Routes>
        <Route path="/interview/:token" element={<InterviewPage />} />
      </Routes>
    </MemoryRouter>,
  );

  return () => options as SocketOptions;
}

describe("InterviewPage end screen", () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.getCandidateInfo).mockResolvedValue({
      data: {
        session_id: 3,
        role_title: "Frontend Engineer",
        time_limit_min: 45,
        session_status: "active",
        in_use_elsewhere: false,
      },
    } as Awaited<ReturnType<typeof sessionsApi.getCandidateInfo>>);
  });

  it("tells the candidate the interview could not continue when the session failed", async () => {
    const socketOptions = renderPage();
    await waitFor(() => expect(sessionsApi.getCandidateInfo).toHaveBeenCalled());

    act(() => {
      socketOptions().onSessionFailed?.();
      socketOptions().onStateChange("complete");
    });

    expect(screen.getByText("Interview Could Not Continue")).toBeInTheDocument();
    expect(screen.queryByText("Interview Complete")).not.toBeInTheDocument();
  });

  it("shows the completion screen when the session ends normally", async () => {
    const socketOptions = renderPage();
    await waitFor(() => expect(sessionsApi.getCandidateInfo).toHaveBeenCalled());

    act(() => socketOptions().onStateChange("complete"));

    expect(screen.getByText("Interview Complete")).toBeInTheDocument();
  });
});

describe("InterviewPage single-browser access", () => {
  function mockCandidateInfo(overrides: Partial<CandidateInfo>) {
    vi.mocked(sessionsApi.getCandidateInfo).mockResolvedValue({
      data: {
        session_id: 3,
        role_title: "Frontend Engineer",
        time_limit_min: 45,
        session_status: "pending",
        in_use_elsewhere: false,
        ...overrides,
      },
    } as Awaited<ReturnType<typeof sessionsApi.getCandidateInfo>>);
  }

  it("sends this browser's id when loading the interview", async () => {
    mockCandidateInfo({});
    const socketOptions = renderPage();

    await waitFor(() =>
      expect(sessionsApi.getCandidateInfo).toHaveBeenCalledWith(
        "invite-token",
        expect.stringMatching(/^[0-9a-f]{32}$/),
      ),
    );
    const [, clientId] = vi.mocked(sessionsApi.getCandidateInfo).mock.calls[0];
    expect(socketOptions().clientId).toBe(clientId);
  });

  it("blocks the page when another browser already started the interview", async () => {
    mockCandidateInfo({ session_status: "active", in_use_elsewhere: true });
    renderPage();

    expect(await screen.findByText("Interview Already in Progress")).toBeInTheDocument();
    expect(screen.queryByText("Interview Complete")).not.toBeInTheDocument();
  });

  it("blocks the page when another browser wins the start", async () => {
    mockCandidateInfo({});
    const socketOptions = renderPage();
    await waitFor(() => expect(sessionsApi.getCandidateInfo).toHaveBeenCalled());

    act(() => {
      socketOptions().onSessionFailed?.("session_in_use");
      socketOptions().onStateChange("complete");
    });

    expect(screen.getByText("Interview Already in Progress")).toBeInTheDocument();
    expect(screen.queryByText("Interview Could Not Continue")).not.toBeInTheDocument();
  });
});

describe("InterviewPage invite link loading", () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.getCandidateInfo).mockReset();
  });

  it("tells the candidate the link is invalid instead of claiming the interview is complete", async () => {
    vi.mocked(sessionsApi.getCandidateInfo).mockRejectedValueOnce(httpError(404));
    renderPage();

    expect(await screen.findByText("Interview Link Not Valid")).toBeInTheDocument();
    expect(screen.queryByText("Interview Complete")).not.toBeInTheDocument();
  });

  it("lets the candidate retry after a network failure", async () => {
    vi.mocked(sessionsApi.getCandidateInfo)
      .mockRejectedValueOnce(httpError())
      .mockResolvedValueOnce({
        data: {
          session_id: 3,
          role_title: "Frontend Engineer",
          time_limit_min: 45,
          session_status: "pending",
          in_use_elsewhere: false,
        },
      } as Awaited<ReturnType<typeof sessionsApi.getCandidateInfo>>);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Couldn't Load Your Interview")).toBeInTheDocument();
    expect(screen.queryByText("Interview Complete")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
  });

  it("does not offer the hardware check until the interview has loaded", () => {
    vi.mocked(sessionsApi.getCandidateInfo).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Loading your interview...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hardware checks done" })).not.toBeInTheDocument();
  });
});

describe("InterviewPage microphone start", () => {
  beforeEach(() => {
    startCapture.mockReset();
    connect.mockReset();
    vi.mocked(sessionsApi.getCandidateInfo).mockResolvedValue({
      data: {
        session_id: 3,
        role_title: "Frontend Engineer",
        time_limit_min: 45,
        session_status: "pending",
        in_use_elsewhere: false,
      },
    } as Awaited<ReturnType<typeof sessionsApi.getCandidateInfo>>);
  });

  it("explains a microphone failure and does not start the AI session", async () => {
    startCapture.mockResolvedValue(false);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Hardware checks done" }));

    expect(await screen.findByText(/couldn't access your microphone/)).toBeInTheDocument();
    expect(connect).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Start Interview/ })).toBeInTheDocument();
  });

  it("connects once the microphone is capturing", async () => {
    startCapture.mockResolvedValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Hardware checks done" }));

    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
  });
});

describe("InterviewPage wrap-up", () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.getCandidateInfo).mockResolvedValue({
      data: {
        session_id: 3,
        role_title: "Frontend Engineer",
        time_limit_min: 45,
        session_status: "active",
        in_use_elsewhere: false,
      },
    } as Awaited<ReturnType<typeof sessionsApi.getCandidateInfo>>);
    vi.mocked(sessionsApi.audioComplete).mockReset().mockRejectedValue(httpError(500));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops retrying audio_complete and tells the candidate when the end cannot be recorded", async () => {
    const socketOptions = renderPage();
    await waitFor(() => expect(sessionsApi.getCandidateInfo).toHaveBeenCalled());
    vi.useFakeTimers();

    act(() => socketOptions().onStateChange("draining_audio"));
    // 10s drain safety timeout, then retries 2s + 4s + 8s + 8s apart.
    await act(() => vi.advanceTimersByTimeAsync(10_000 + 2_000 + 4_000 + 8_000 + 8_000));

    expect(sessionsApi.audioComplete).toHaveBeenCalledTimes(5);
    expect(screen.getByText("Interview Could Not Continue")).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(sessionsApi.audioComplete).toHaveBeenCalledTimes(5);
  });
});
