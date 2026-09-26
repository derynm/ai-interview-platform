import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AssessmentInvitePage from "@/pages/assessments/AssessmentInvitePage";
import { assessmentsApi } from "@/services/assessments";
import type { Assessment, Session } from "@/types";

vi.mock("@/services/assessments", () => ({
  assessmentsApi: { get: vi.fn(), getSessions: vi.fn(), createSession: vi.fn() },
}));

const pendingSession: Session = {
  id: 4,
  assessment_id: 7,
  invite_token: "tok",
  invite_url: "http://localhost:5173/interview/tok",
  status: "ended",
};

const savedAssessment: Assessment = {
  id: 7,
  name: "Frontend Engineer",
  time_limit_min: 45,
  skills: [],
};
const noSessions: Session[] = [];

function serverError(message: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Server error", "ERR_BAD_RESPONSE", config, null, {
    status: 500,
    statusText: "",
    headers: {},
    config,
    data: { errors: [{ message }] },
  });
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/assessments/7/invite"]}>
      <Routes>
        <Route path="/assessments/:id/invite" element={<AssessmentInvitePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockLoaded(sessions: Session[] = noSessions) {
  vi.mocked(assessmentsApi.get).mockResolvedValue({
    data: { assessment: savedAssessment },
  } as Awaited<ReturnType<typeof assessmentsApi.get>>);
  vi.mocked(assessmentsApi.getSessions).mockResolvedValue({
    data: { sessions },
  } as Awaited<ReturnType<typeof assessmentsApi.getSessions>>);
}

describe("AssessmentInvitePage", () => {
  beforeEach(() => {
    vi.mocked(assessmentsApi.get).mockReset();
    vi.mocked(assessmentsApi.getSessions).mockReset();
    vi.mocked(assessmentsApi.createSession).mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows a load error instead of an empty candidate list", async () => {
    vi.mocked(assessmentsApi.get).mockRejectedValueOnce(serverError("Database unavailable"));
    vi.mocked(assessmentsApi.getSessions).mockResolvedValue({
      data: { sessions: noSessions },
    } as Awaited<ReturnType<typeof assessmentsApi.getSessions>>);
    renderPage();

    expect(await screen.findByText("Database unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No candidates yet")).not.toBeInTheDocument();
  });

  it("keeps the invite dialog open and explains a failed invite", async () => {
    mockLoaded();
    vi.mocked(assessmentsApi.createSession).mockRejectedValue(
      serverError("Assessment has no skills"),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Invite Candidate/ }));
    await user.click(screen.getByRole("button", { name: "Create Link" }));

    expect(await screen.findByText("Assessment has no skills")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("says the copy failed when the clipboard is unavailable", async () => {
    mockLoaded([{ ...pendingSession, status: "pending" }]);
    const user = userEvent.setup();
    // After setup(): user-event installs its own clipboard stub.
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Copy link/ }));

    await waitFor(() => expect(screen.getByText(/Copy failed/)).toBeInTheDocument());
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });
});
