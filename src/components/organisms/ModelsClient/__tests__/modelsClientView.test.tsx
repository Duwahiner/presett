import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelsClientView } from "../modelsClientView";

describe("ModelsClientView profile selector", () => {
  const baseProps = {
    assignments: [],
    catalog: { openai: { "gpt-4": ["high"] } },
    connectedProviders: [],
    catalogLoading: false,
    loading: false,
    error: null,
    saving: null,
    activeProfile: "zeta",
    syncing: false,
    switchingProfile: false,
    resetting: false,
    onSave: vi.fn(),
    onSwitchProfile: vi.fn(),
    onSync: vi.fn(),
    onReset: vi.fn(),
    profiles: [],
  };

  it("sorts the profile selector list deterministically", async () => {
    render(
      <ModelsClientView
        {...baseProps}
        profiles={[
          { name: "zeta", displayName: "Zeta", active: false, modelCount: 1, updatedAt: "", strategy: "generated-multi", incomplete: false },
          { name: "alpha", displayName: "Alpha", active: false, modelCount: 1, updatedAt: "", strategy: "generated-multi", incomplete: false },
          { name: "mid", displayName: "Mid", active: false, modelCount: 1, updatedAt: "", strategy: "generated-multi", incomplete: false },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("combobox"));

    const options = screen.getAllByRole("option").map((o) => o.textContent?.trim());
    expect(options).toEqual(["Alpha", "Mid", "Zeta"]);
  });

  it("renders a warning banner when provider detection fails without hiding the catalog", () => {
    render(
      <ModelsClientView
        {...baseProps}
        activeProfile="gentle-orchestrator"
        assignments={[
          { agentKey: "sdd-apply", provider: "openai", model: "gpt-4", variant: "high" },
        ]}
        providerAuthStatus={{
          ok: false,
          code: "CLI_TIMEOUT",
          message: "OpenCode providers list timed out.",
        }}
      />,
    );

    // A non-blocking warning is shown when detection fails.
    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    // The failure must NOT replace the catalog UI: the assignment row still renders.
    expect(screen.getByRole("heading", { name: "sdd-apply" })).toBeTruthy();
  });

  it("renders no provider-auth warning when detection succeeds", () => {
    render(
      <ModelsClientView {...baseProps} providerAuthStatus={{ ok: true }} />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the content region vertically scrollable and contains the unique filtered assignment list without breaking actions", () => {
    render(
      <ModelsClientView
        {...baseProps}
        activeProfile="gentle-orchestrator"
        assignments={[
          { agentKey: "gentle-orchestrator", provider: "openai", model: "gpt-4", variant: "high" },
          { agentKey: "sdd-init", provider: "openai", model: "gpt-4", variant: "low" },
          { agentKey: "sdd-apply", provider: "anthropic", model: "claude-4", variant: "high" },
          { agentKey: "sdd-orchestrator-other", provider: "google", model: "gemini-2", variant: "standard" },
        ]}
      />,
    );

    // The content container is the scroll boundary: when the unique filtered
    // agent rows exceed the available height, this region scrolls vertically
    // instead of clipping the page.
    const scroll = screen.getByTestId("models-content-scroll");
    expect(scroll.className).toContain("overflow-y-auto");
    expect(scroll.className).toContain("flex-1");
    expect(scroll.className).toContain("min-h-0");

    // Only the active profile's own agents render, and they live inside the
    // scrollable region (the base profile owns the orchestrator + bare phases).
    expect(scroll.contains(screen.getByRole("heading", { name: "gentle-orchestrator" }))).toBe(true);
    expect(scroll.contains(screen.getByRole("heading", { name: "sdd-init" }))).toBe(true);
    expect(scroll.contains(screen.getByRole("heading", { name: "sdd-apply" }))).toBe(true);
    // Other profiles' agents are filtered out of the unique list.
    expect(screen.queryByRole("heading", { name: "sdd-orchestrator-other" })).toBeNull();

    // Actions stay outside the scroll region and remain rendered/accessible.
    expect(screen.getByRole("button", { name: /sync now/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /reset all/i })).toBeTruthy();
  });

  it("renders only the active named profile's agents and excludes other profiles and unrelated generals", () => {
    render(
      <ModelsClientView
        {...baseProps}
        activeProfile="sdd-orchestrator-work"
        assignments={[
          { agentKey: "sdd-orchestrator-work", provider: "openai", model: "gpt-4", variant: "high" },
          { agentKey: "sdd-init-work", provider: "openai", model: "gpt-5", variant: "high" },
          { agentKey: "sdd-orchestrator-other", provider: "google", model: "gemini-2", variant: "standard" },
          { agentKey: "sdd-init-other", provider: "google", model: "gemini-2", variant: "low" },
          { agentKey: "gentle-orchestrator", provider: "openai", model: "gpt-4", variant: "low" },
        ]}
      />,
    );

    // The orchestrator of the selected profile is shown by its human profile
    // name, never by the raw `sdd-orchestrator-<name>` agent key.
    expect(screen.getByRole("heading", { name: "work" })).toBeTruthy();
    expect(screen.queryAllByRole("heading", { name: /sdd-orchestrator-/ })).toHaveLength(0);
    // The selected profile's own phase agent keeps its comprehensible key.
    expect(screen.getByRole("heading", { name: "sdd-init-work" })).toBeTruthy();

    // Agents of other profiles and the base general are isolated out.
    expect(screen.queryByRole("heading", { name: "sdd-orchestrator-other" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "sdd-init-other" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "gentle-orchestrator" })).toBeNull();
  });

  it("saves the orchestrator through the technical agentKey while showing the profile name", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ModelsClientView
        {...baseProps}
        activeProfile="sdd-orchestrator-orchestrator-free"
        assignments={[
          {
            agentKey: "sdd-orchestrator-orchestrator-free",
            provider: "openai",
            model: "gpt-4",
            variant: "high",
          },
        ]}
        onSave={onSave}
      />,
    );

    // Visible heading exposes the profile name, not the internal prefix.
    expect(screen.getByRole("heading", { name: "orchestrator-free" })).toBeTruthy();
    expect(screen.queryAllByRole("heading", { name: /sdd-orchestrator-/ })).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save Assignment" }));

    // Saving keeps the technical agent key intact.
    expect(onSave).toHaveBeenCalledWith("sdd-orchestrator-orchestrator-free", {
      provider: "openai",
      model: "gpt-4",
      variant: "high",
    });
  });

  it("renders only base agents when the base profile is active, isolating named profiles out", () => {
    render(
      <ModelsClientView
        {...baseProps}
        activeProfile="gentle-orchestrator"
        assignments={[
          { agentKey: "gentle-orchestrator", provider: "openai", model: "gpt-4", variant: "low" },
          { agentKey: "sdd-init", provider: "openai", model: "gpt-4", variant: "low" },
          { agentKey: "sdd-orchestrator-work", provider: "openai", model: "gpt-4", variant: "high" },
          { agentKey: "sdd-init-work", provider: "openai", model: "gpt-5", variant: "high" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "gentle-orchestrator" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "sdd-init" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "sdd-orchestrator-work" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "sdd-init-work" })).toBeNull();
  });

  it("shows the exact profile name (not the internal prefix) in the active profile header and selector", () => {
    render(
      <ModelsClientView
        {...baseProps}
        activeProfile="sdd-orchestrator-orchestrator-free"
        profiles={[
          {
            name: "orchestrator-free",
            displayName: "orchestrator-free",
            active: true,
            modelCount: 1,
            updatedAt: "",
            strategy: "generated-multi",
            incomplete: false,
          },
        ]}
      />,
    );

    // Header and selector both surface the human profile name; the internal
    // prefix never appears anywhere.
    expect(screen.getAllByText("orchestrator-free").length).toBeGreaterThan(0);
    expect(screen.queryByText(/sdd-orchestrator-/)).toBeNull();
    // The selector trigger displays the same human profile name.
    expect(screen.getByRole("combobox").textContent).toContain("orchestrator-free");
  });

  it("keeps the base profile header and selector correct", () => {
    render(
      <ModelsClientView
        {...baseProps}
        activeProfile="gentle-orchestrator"
        profiles={[
          {
            name: "",
            displayName: "Gentle-Orchestrator",
            active: true,
            modelCount: 1,
            updatedAt: "",
            strategy: "generated-multi",
            incomplete: false,
          },
        ]}
      />,
    );

    // The base header shows the human base label.
    expect(screen.getByText("Gentle-Orchestrator")).toBeTruthy();
    // The selector never leaks the internal orchestrator prefix for base.
    expect(screen.getByRole("combobox").textContent).not.toContain(
      "sdd-orchestrator-",
    );
  });
});