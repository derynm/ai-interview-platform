import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import NumericParamsRoute from "@/components/NumericParamsRoute";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<NumericParamsRoute />}>
          <Route path="/assessments/new" element={<p>New assessment</p>} />
          <Route path="/assessments/:id/sessions/:sessionId/portfolio" element={<p>Portfolio</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("NumericParamsRoute", () => {
  it("renders pages whose ids are numeric", () => {
    renderAt("/assessments/7/sessions/3/portfolio");
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
  });

  it("renders pages without ids", () => {
    renderAt("/assessments/new");
    expect(screen.getByText("New assessment")).toBeInTheDocument();
  });

  it("shows not found for a non-numeric id in a nested route", () => {
    renderAt("/assessments/7/sessions/abc/portfolio");
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("Portfolio")).not.toBeInTheDocument();
  });
});
