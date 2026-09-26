import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LiveMonitorPage from "@/pages/monitor/LiveMonitorPage";
import { sessionsApi } from "@/services/sessions";
import { useCoverageWebSocket } from "@/hooks/useCoverageWebSocket";
import type { TranscriptTurn } from "@/types";

vi.mock("@/services/sessions", () => ({
  sessionsApi: { get: vi.fn(), getTranscript: vi.fn(), endSession: vi.fn() },
}));
vi.mock("@/hooks/useCoverageWebSocket", () => ({ useCoverageWebSocket: vi.fn() }));

function socketState(overrides: Partial<ReturnType<typeof useCoverageWebSocket>> = {}) {
  return {
    coverageMap: null,
    sessionEnded: false,
    sessionEndReason: null,
    isConnected: true,
    connectionFailed: false,
    reconnect: vi.fn(),
    ...overrides,
  };
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/assessments/7/sessions/3/monitor"]}>
      <Routes>
        <Route path="/assessments/:id/sessions/:sessionId/monitor" element={<LiveMonitorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LiveMonitorPage", () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.get).mockReset();
    vi.mocked(sessionsApi.getTranscript).mockResolvedValue({
      data: { turns: [] as TranscriptTurn[], total: 0 },
    } as Awaited<ReturnType<typeof sessionsApi.getTranscript>>);
  });

  it("shows a retryable error when the session cannot be loaded", async () => {
    vi.mocked(useCoverageWebSocket).mockReturnValue(socketState());
    vi.mocked(sessionsApi.get).mockRejectedValueOnce(new Error("boom"));
    renderPage();

    expect(await screen.findByText("Failed to load the session.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End Session" })).not.toBeInTheDocument();
  });

  it("offers a manual reconnect once live updates are lost", async () => {
    vi.mocked(useCoverageWebSocket).mockReturnValue(
      socketState({ isConnected: false, connectionFailed: true }),
    );
    vi.mocked(sessionsApi.get).mockResolvedValue({
      data: { session: { status: "active", started_at: new Date().toISOString() } },
    } as Awaited<ReturnType<typeof sessionsApi.get>>);
    renderPage();

    expect(await screen.findByText("Live updates disconnected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
    expect(screen.queryByText("Reconnecting...")).not.toBeInTheDocument();
  });

  it("labels candidate turns as the candidate, not as the assessor", async () => {
    vi.mocked(useCoverageWebSocket).mockReturnValue(socketState());
    vi.mocked(sessionsApi.get).mockResolvedValue({
      data: { session: { status: "active", started_at: new Date().toISOString() } },
    } as Awaited<ReturnType<typeof sessionsApi.get>>);
    vi.mocked(sessionsApi.getTranscript).mockResolvedValue({
      data: {
        turns: [{ id: 1, turn_number: 1, speaker: "candidate", text: "I profiled the list." }],
        total: 1,
      },
    } as Awaited<ReturnType<typeof sessionsApi.getTranscript>>);
    renderPage();

    await screen.findByText("I profiled the list.");
    expect(screen.getByText("Candidate")).toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });
});
