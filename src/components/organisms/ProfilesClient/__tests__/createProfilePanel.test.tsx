import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setLocale } from "@/resources/resources";
import { CreateProfilePanel, normalizeName } from "../createProfilePanel";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";

const ASSIGNED = { provider: "openai", model: "gpt-4", variant: "high" };

const DEFAULT_CATALOG: ModelCatalog = {
  openai: { "gpt-4": ["high"], "gpt-5": [] },
};

interface PanelOverrides {
  open?: boolean;
  pendingAction?: string | null;
  catalog?: ModelCatalog;
  connectedProviders?: string[];
  newAssignments?: Record<string, { provider: string; model: string; variant: string }>;
}

function renderPanel(overrides: PanelOverrides = {}) {
  const handlers = {
    onAssignmentChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };
  const props = {
    open: true,
    pendingAction: null,
    catalog: DEFAULT_CATALOG,
    connectedProviders: [] as string[],
    newAssignments: {} as Record<string, { provider: string; model: string; variant: string }>,
    ...handlers,
    ...overrides,
  };
  render(<CreateProfilePanel {...props} />);
  return { user: userEvent.setup(), props };
}

describe("normalizeName", () => {
  it("lowercases and strips invalid characters from a mixed-case name", () => {
    expect(normalizeName("MyProfile")).toBe("myprofile");
  });

  it("removes spaces and punctuation", () => {
    expect(normalizeName("My Profile!")).toBe("myprofile");
  });

  it("collapses to an empty string when only invalid characters are present", () => {
    expect(normalizeName("!!!")).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeName("  work  ")).toBe("work");
  });

  it("removes XSS-style markup", () => {
    expect(normalizeName("<script>")).toBe("script");
  });

  it("preserves allowed hyphens and underscores", () => {
    expect(normalizeName("My_Name-2")).toBe("my_name-2");
  });
});

describe("CreateProfilePanel single-orchestrator form", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("never submits, even with a valid name and an assigned orchestrator", async () => {
    const { user, props } = renderPanel({
      newAssignments: { orchestrator: ASSIGNED },
    });

    await user.type(screen.getByPlaceholderText("Profile name"), "Mi Perfil");

    const save = screen.getByRole("button", { name: /save profile/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await user.click(save);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when the form is submitted with the keyboard", async () => {
    const { user, props } = renderPanel({
      newAssignments: { orchestrator: ASSIGNED },
    });

    await user.type(screen.getByPlaceholderText("Profile name"), "work{Enter}");

    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("shows the retired notice as the help text instead of the old enablement hint", () => {
    renderPanel();

    expect(
      screen.getByText(
        "Creating, editing and repairing named profiles is no longer available: Gentle-AI retired the profile flags.",
      ),
    ).not.toBeNull();
    expect(screen.queryByText(/to enable profile creation/i)).toBeNull();
  });

  it("still flags the reserved internal prefix with a specific error", async () => {
    const { user } = renderPanel({
      newAssignments: { orchestrator: ASSIGNED },
    });

    await user.type(
      screen.getByPlaceholderText("Profile name"),
      "sdd-orchestrator-free",
    );

    expect(
      screen.getByText(/cannot start with the reserved internal prefix/i),
    ).toBeTruthy();
  });

  it("renders only the orchestrator section — no phase sections and no copy button", () => {
    renderPanel();

    // A single orchestrator phase row is visible.
    expect(screen.getAllByLabelText("Provider")).toHaveLength(1);

    // No legacy planning/design/closure sections, no copy-to-all action.
    expect(screen.queryByRole("button", { name: /planning/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /design & execution/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /closure & support/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /copy to all/i })).toBeNull();
  });

  it("renders the orchestrator section header without leaking raw i18n keys", () => {
    renderPanel();

    expect(screen.getAllByText("Orchestrator").length).toBeGreaterThan(0);
    expect(screen.queryByText(/profiles_section_/)).toBeNull();
  });

  it("sorts providers deterministically in the orchestrator phase row", async () => {
    const { user } = renderPanel({
      catalog: {
        zebra: { "model-z": ["v2", "v1"] },
        "alpha-prov": { "model-a": ["v1"] },
      },
    });

    await user.click(screen.getByRole("combobox", { name: /provider/i }));
    const providers = screen.getAllByRole("option").map((o) => o.textContent?.trim());
    expect(providers).toEqual(["alpha-prov", "zebra"]);
  });

  it("shows the connected provider marker in the orchestrator provider list", async () => {
    const { user } = renderPanel({
      catalog: { openai: { "gpt-4": ["high"] }, acme: { x: ["a"] } },
      connectedProviders: ["openai"],
    });

    await user.click(screen.getByRole("combobox", { name: /provider/i }));
    const option = screen.getByRole("option", { name: /openai/i });
    expect(option.querySelector('[title="Connected"]')).not.toBeNull();
  });

  it("keeps the variant field visible and disabled when the selected model has no variants", () => {
    renderPanel({
      newAssignments: { orchestrator: { provider: "openai", model: "gpt-5", variant: "" } },
    });

    const variantTrigger = screen.getByLabelText("Variant") as HTMLButtonElement;
    expect(variantTrigger.disabled).toBe(true);
  });

  it("renders the orchestrator as a flat, always-visible block without an accordion toggle", () => {
    renderPanel();

    expect(screen.queryByRole("button", { name: /orchestrator/i })).toBeNull();
    expect(screen.getByLabelText("Provider")).not.toBeNull();
  });

  it("shows the variant field when the selected model has variants", () => {
    renderPanel({ newAssignments: { orchestrator: ASSIGNED } });

    expect(screen.getByLabelText("Variant")).not.toBeNull();
  });
});