import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AssessmentNewPage from "@/pages/assessments/AssessmentNewPage";
import AssessmentEditPage from "@/pages/assessments/AssessmentEditPage";
import { assessmentsApi } from "@/services/assessments";
import type { Assessment } from "@/types";

vi.mock("@/services/assessments", () => ({
  assessmentsApi: { create: vi.fn(), get: vi.fn(), update: vi.fn() },
}));

vi.mock("@/services/skillTaxonomies", () => ({
  skillTaxonomiesApi: { list: vi.fn().mockResolvedValue({ data: { skill_taxonomies: [] } }) },
}));

function notFound() {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Not found", "ERR_BAD_REQUEST", config, null, {
    status: 404,
    statusText: "",
    headers: {},
    config,
    data: { errors: [{ message: "Assessment not found" }] },
  });
}

const savedAssessment: Assessment = {
  id: 7,
  name: "Frontend Engineer",
  time_limit_min: 45,
  language: "id",
  skills: [
    {
      id: 11,
      skill_label: "React",
      is_custom: false,
      expected_level: 3,
      display_order: 0,
      l1_anchor: "a",
      l2_anchor: "b",
      l3_anchor: "c",
      l4_anchor: "d",
      l5_anchor: "e",
    },
    {
      id: 12,
      skill_label: "Testing",
      is_custom: false,
      expected_level: 4,
      display_order: 1,
      l1_anchor: "a",
      l2_anchor: "b",
      l3_anchor: "c",
      l4_anchor: "d",
      l5_anchor: "e",
    },
  ],
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/assessments/new" element={<AssessmentNewPage />} />
        <Route path="/assessments/:id/edit" element={<AssessmentEditPage />} />
        <Route path="/assessments/:id/invite" element={<p>Invite page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AssessmentNewPage validation", () => {
  beforeEach(() => {
    vi.mocked(assessmentsApi.create).mockReset();
  });

  it("rejects a whitespace-only role title with a visible message", async () => {
    const user = userEvent.setup();
    renderAt("/assessments/new");

    await user.type(screen.getByLabelText(/Role title/), "   ");
    await user.click(screen.getByRole("button", { name: /Save & Create Session/ }));

    expect(await screen.findByText("Role title is required")).toBeInTheDocument();
    expect(assessmentsApi.create).not.toHaveBeenCalled();
  });

  it("explains which custom skill fields are missing", async () => {
    const user = userEvent.setup();
    renderAt("/assessments/new");

    await user.type(screen.getByLabelText(/Role title/), "Frontend Engineer");
    await user.click(screen.getByRole("button", { name: /Add custom skill/ }));
    await user.click(screen.getByRole("button", { name: /Save & Create Session/ }));

    expect(await screen.findByText("Skill name is required")).toBeInTheDocument();
    expect(screen.getByText("Describe what counts")).toBeInTheDocument();
    expect(screen.getByText("Describe what L1 looks like")).toBeInTheDocument();
    expect(screen.getByText("Describe what L5 looks like")).toBeInTheDocument();
    expect(assessmentsApi.create).not.toHaveBeenCalled();
  });
});

describe("AssessmentEditPage", () => {
  beforeEach(() => {
    vi.mocked(assessmentsApi.get).mockReset();
    vi.mocked(assessmentsApi.update).mockReset();
  });

  it("shows an error instead of an empty form when loading fails", async () => {
    vi.mocked(assessmentsApi.get).mockRejectedValue(notFound());
    renderAt("/assessments/7/edit");

    expect(
      await screen.findByText("This assessment doesn't exist or was deleted."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/ })).toBeInTheDocument();
  });

  it("deletes a removed skill and keeps the others and the language on save", async () => {
    vi.mocked(assessmentsApi.get).mockResolvedValue({
      data: { assessment: savedAssessment },
    } as Awaited<ReturnType<typeof assessmentsApi.get>>);
    vi.mocked(assessmentsApi.update).mockResolvedValue(
      {} as Awaited<ReturnType<typeof assessmentsApi.update>>,
    );
    const user = userEvent.setup();
    renderAt("/assessments/7/edit");

    await screen.findByDisplayValue("Frontend Engineer");
    await user.click(screen.getAllByRole("button", { name: "Remove skill" })[0]);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(assessmentsApi.update).toHaveBeenCalled());
    const [, payload] = vi.mocked(assessmentsApi.update).mock.calls[0];
    expect(payload.language).toBe("id");
    expect(payload.assessment_skills_attributes).toEqual([
      expect.objectContaining({ id: 12, skill_label: "Testing", display_order: 0 }),
      { id: 11, _destroy: true },
    ]);
  });
});
