import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/hooks/useAudioCapture", () => ({
  useAudioCapture: () => ({ start: vi.fn(), stop: vi.fn(), mute: vi.fn(), unmute: vi.fn() }),
}));

vi.mock("@/components/HardwareCheck", () => ({ default: () => null }));

type SocketOptions = Parameters<typeof useAudioWebSocket>[0];

function renderPage() {
  let options: SocketOptions | undefined;
  vi.mocked(useAudioWebSocket).mockImplementation((opts) => {
    options = opts;
    return {
      connect: vi.fn(),
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
