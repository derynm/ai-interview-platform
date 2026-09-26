import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import DemoRequestDialog from "@/components/landing/DemoRequestDialog";

async function openDialog() {
  const user = userEvent.setup();
  render(<DemoRequestDialog trigger={<button type="button">Request a demo</button>} />);
  await user.click(screen.getByRole("button", { name: "Request a demo" }));
  return user;
}

describe("DemoRequestDialog", () => {
  it("requires name, a valid work email, and company before accepting the request", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText(/Full name/), "   ");
    await user.type(screen.getByLabelText(/Work email/), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(screen.getByText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your company")).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/Thanks/)).toBeNull();
  });

  it("thanks the visitor, then starts from a blank form when reopened", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText(/Full name/), "Sari Wijaya");
    await user.type(screen.getByLabelText(/Work email/), "sari@example.test");
    await user.type(screen.getByLabelText(/Company/), "Example Corp");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(screen.getByRole("heading", { name: "Thanks, Sari Wijaya!" })).toBeInTheDocument();
    expect(screen.getByText(/sari@example.test/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Request a demo" }));
    expect(screen.getByLabelText(/Full name/)).toHaveValue("");
  });
});
