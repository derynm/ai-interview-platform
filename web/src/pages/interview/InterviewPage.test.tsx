import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InterviewPage from "@/pages/interview/InterviewPage";
import { useAudioWebSocket } from "@/hooks/useAudioWebSocket";
import { sessionsApi } from "@/services/sessions";

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
