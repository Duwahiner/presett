import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentAssignmentRow } from "../agentAssignmentRow";

const CATALOG = { openai: { "gpt-4": ["high"] } };

describe("AgentAssignmentRow human label", () => {
  it("renders the human label instead of the raw agentKey in visible text and aria", () => {
    render(
      <AgentAssignmentRow
        agentKey="sdd-orchestrator-orchestrator-free"
        label="orchestrator-free"
        provider="openai"
        model="gpt-4"
        variant="high"
        catalog={CATALOG}
        onSave={vi.fn()}
      />,
    );

    // Visible heading and aria-label use the human profile name.
    expect(screen.getByRole("heading", { name: "orchestrator-free" })).toBeTruthy();
    // The internal orchestrator prefix must not surface in text or aria.
    expect(screen.queryByText(/sdd-orchestrator-/)).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "sdd-orchestrator-orchestrator-free" }),
    ).toBeNull();
  });

  it("falls back to the raw agentKey when no label is provided", () => {
    render(
      <AgentAssignmentRow
        agentKey="sdd-init-work"
        provider="openai"
        model="gpt-4"
        variant="high"
        catalog={CATALOG}
        onSave={vi.fn()}
      />,
    );

    // Phase rows without an explicit label keep the existing raw key label.
    expect(screen.getByRole("heading", { name: "sdd-init-work" })).toBeTruthy();
  });

  it("keeps saving through the technical agentKey while displaying the human label", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <AgentAssignmentRow
        agentKey="sdd-orchestrator-orchestrator-free"
        label="orchestrator-free"
        provider="openai"
        model="gpt-4"
        variant="high"
        catalog={CATALOG}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    // Provider/model/variant are already valid, so Save Assignment is enabled.
    await user.click(screen.getByRole("button", { name: "Save Assignment" }));

    expect(onSave).toHaveBeenCalledWith({
      provider: "openai",
      model: "gpt-4",
      variant: "high",
    });
  });
});