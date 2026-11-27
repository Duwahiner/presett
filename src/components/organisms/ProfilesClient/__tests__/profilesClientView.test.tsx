import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ProfilesClientView } from "../profilesClientView";
import { isOutsideCatalog, orchestratorAgentKey } from "../profilesClientView";
import { filterAndSortProfiles } from "../profilesClient";
import { setLocale } from "@/resources/resources";
import type { ProfilesClientViewProps, Profile } from "../profilesClientTypes";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/listingControlsTypes";

const profiles: Profile[] = [
  { name: "alpha", displayName: "Alpha", active: true, modelCount: 3, updatedAt: "2026-01-15T10:00:00.000Z" },
  { name: "bravo", displayName: "Bravo", active: false, modelCount: 1, updatedAt: "2026-03-20T14:30:00.000Z" },
  { name: "charlie", displayName: "Charlie", active: true, modelCount: 2, updatedAt: "2026-02-10T08:15:00.000Z" },
];

const profilesConfig: ListingControlsConfig = {
  search: {
    placeholder: "listing_search_placeholder",
    ariaLabel: "listing_search_aria",
  },
  sort: {
    fields: [
      { value: "name", labelKey: "listing_sort_name" },
      { value: "active", labelKey: "listing_sort_active" },
      { value: "updatedAt", labelKey: "listing_sort_lastUpdated" },
    ],
    defaultField: "name",
    defaultDir: "asc",
  },
};

const defaultControlsState: ListingControlsState = {
  search: "",
  activeFilters: {},
  sortField: "name",
  sortDir: "asc",
};

describe("ProfilesClientView", () => {
  beforeEach(() => {
    setLocale("en");
  });

  const defaultProps: ProfilesClientViewProps = {
    profiles: [],
    catalog: {},
    catalogLoading: false,
    loading: false,
    error: null,
    pendingAction: null,
    newAssignments: {},
    onAssignmentChange: vi.fn(),
    onCreate: vi.fn(),
    onSwitch: vi.fn(),
    onDeleteStart: vi.fn(),
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
    deleteConfirmProfile: null,
    editingProfile: null,
    editAssignments: {},
    detailLoading: false,
    detailError: null,
    onEditStart: vi.fn(),
    onEditSave: vi.fn(),
    onEditCancel: vi.fn(),
    onEditAssignmentChange: vi.fn(),
  };

  it("renders the create profile button disabled so it cannot open the creation form", async () => {
    render(<ProfilesClientView {...defaultProps} />);

    const createBtn = screen.getByRole("button", { name: /create profile/i });
    expect(createBtn.tagName).toBe("BUTTON");
    expect((createBtn as HTMLButtonElement).disabled).toBe(true);

    await userEvent.click(createBtn);

    expect(screen.queryByPlaceholderText("Profile name")).toBeNull();
  });

  it("explains that creating, editing and repairing named profiles is retired", () => {
    render(<ProfilesClientView {...defaultProps} />);

    expect(
      screen.getByText(
        "Creating, editing and repairing named profiles is no longer available: Gentle-AI retired the profile flags.",
      ),
    ).not.toBeNull();
  });

  it("never submits the creation panel, even with a valid name and orchestrator assignment", async () => {
    const onCreate = vi.fn();
    render(
      <ProfilesClientView
        {...defaultProps}
        onCreate={onCreate}
        showForm={true}
        newAssignments={{ orchestrator: { provider: "openai", model: "gpt-4", variant: "high" } }}
        catalog={{ openai: { "gpt-4": ["high"] } }}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText("Profile name"), "work");

    const save = screen.getByRole("button", { name: "SAVE PROFILE" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await userEvent.click(save);
    expect(onCreate).not.toHaveBeenCalled();
  });

  describe("delete action for the base profile", () => {
    it("does not render a Delete button for the base profile (empty name)", () => {
      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={[
            { name: "", displayName: "Gentle-Orchestrator", active: true, modelCount: 14, updatedAt: "2026-01-01T00:00:00.000Z" },
            { name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" },
          ]}
        />,
      );

      // Only the named profile exposes a Delete action; the Base card must not.
      expect(screen.getAllByRole("button", { name: /delete/i })).toHaveLength(1);
    });

    it("never opens the delete confirmation for the base profile", async () => {
      const onDeleteStart = vi.fn();
      render(
        <ProfilesClientView
          {...defaultProps}
          onDeleteStart={onDeleteStart}
          profiles={[
            { name: "", displayName: "Gentle-Orchestrator", active: true, modelCount: 14, updatedAt: "2026-01-01T00:00:00.000Z" },
          ]}
        />,
      );

      // No Delete trigger exists on the Base card, so starting a delete is impossible.
      expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
      expect(onDeleteStart).not.toHaveBeenCalled();
    });
  });

  describe("filtering", () => {
    it("renders only profiles matching the search text", () => {
      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={profiles}
          derivedProfiles={profiles.filter((p) => p.name.includes("alpha"))}
          controls={profilesConfig}
          controlsState={{ ...defaultControlsState, search: "alpha" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      expect(screen.getByText("Alpha")).not.toBeNull();
      expect(screen.queryByText("Bravo")).toBeNull();
      expect(screen.queryByText("Charlie")).toBeNull();
    });

    it("search is case-insensitive", () => {
      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={profiles}
          derivedProfiles={profiles.filter((p) => p.displayName.toLowerCase().includes("char"))}
          controls={profilesConfig}
          controlsState={{ ...defaultControlsState, search: "CHAR" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      expect(screen.getByText("Charlie")).not.toBeNull();
      expect(screen.queryByText("Alpha")).toBeNull();
    });
  });

  describe("sorting", () => {
    it("sorts profiles by name ascending", () => {
      const sorted = [...profiles].sort((a, b) => a.name.localeCompare(b.name));

      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={profiles}
          derivedProfiles={sorted}
          controls={profilesConfig}
          controlsState={{ ...defaultControlsState, sortField: "name", sortDir: "asc" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      const headings = screen.getAllByRole("heading", { level: 4 });
      const names = headings.map((h) => h.textContent?.trim());
      expect(names).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("sorts profiles by name descending", () => {
      const sorted = [...profiles].sort((a, b) => b.name.localeCompare(a.name));

      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={profiles}
          derivedProfiles={sorted}
          controls={profilesConfig}
          controlsState={{ ...defaultControlsState, sortField: "name", sortDir: "desc" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      const headings = screen.getAllByRole("heading", { level: 4 });
      const names = headings.map((h) => h.textContent?.trim());
      expect(names).toEqual(["Charlie", "Bravo", "Alpha"]);
    });

    it("sorts profiles by active status descending (active first)", () => {
      const sorted = [...profiles].sort((a, b) => {
        const cmp = Number(b.active) - Number(a.active);
        if (cmp !== 0) return cmp;
        return a.name.localeCompare(b.name);
      });

      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={profiles}
          derivedProfiles={sorted}
          controls={profilesConfig}
          controlsState={{ ...defaultControlsState, sortField: "active", sortDir: "desc" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      const headings = screen.getAllByRole("heading", { level: 4 });
      const names = headings.map((h) => h.textContent?.trim());
      expect(names[0]).toBe("Alpha");
      expect(names[1]).toBe("Charlie");
      expect(names[2]).toBe("Bravo");
    });
  });

  describe("empty states", () => {
    it("shows no-data variant when original array is empty", () => {
      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={[]}
          derivedProfiles={[]}
          controls={profilesConfig}
          controlsState={defaultControlsState}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      expect(screen.getByText("No profiles yet")).not.toBeNull();
    });

    it("shows no-matches variant when filters remove all items", () => {
      render(
        <ProfilesClientView
          {...defaultProps}
          profiles={profiles}
          derivedProfiles={[]}
          controls={profilesConfig}
          controlsState={{ ...defaultControlsState, search: "zzz" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      expect(screen.getByText("No matching profiles")).not.toBeNull();
    });
  });

  describe("edit detail loading and error", () => {
    const editProps = {
      ...defaultProps,
      profiles: [{ name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
      editingProfile: "alpha",
    };

    it("shows a loading indicator while the detail is loading and disables save", () => {
      render(
        <ProfilesClientView
          {...editProps}
          detailLoading={true}
          editAssignments={{}}
        />,
      );

      expect(screen.getByText(/loading profile details/i)).not.toBeNull();
      expect(screen.getByText("Loading the profile configuration before you can save.")).not.toBeNull();
      const save = screen.getByRole("button", { name: "Save" });
      expect((save as HTMLButtonElement).disabled).toBe(true);
    });

    it("shows an error banner and disables save when the detail fails", () => {
      render(
        <ProfilesClientView
          {...editProps}
          detailError="Network error"
          editAssignments={{}}
        />,
      );

      expect(screen.getByText("Failed to load profile details")).not.toBeNull();
      expect(screen.getByText("Network error")).not.toBeNull();
      expect(screen.getByText("Resolve this error before you can save.")).not.toBeNull();
      const save = screen.getByRole("button", { name: "Save" });
      expect((save as HTMLButtonElement).disabled).toBe(true);
    });

    it("does not crash and disables save when edit assignments are undefined", () => {
      expect(() =>
        render(
          <ProfilesClientView
            {...editProps}
            editAssignments={undefined as never}
          />,
        ),
      ).not.toThrow();

      const save = screen.getByRole("button", { name: "Save" });
      expect((save as HTMLButtonElement).disabled).toBe(true);
    });

    it("renders all orchestrator selectors when assignments are empty and keeps save disabled", () => {
      render(
        <ProfilesClientView
          {...editProps}
          catalog={{ openai: { "gpt-4": ["high"] } }}
          editAssignments={{}}
        />,
      );

      expect(
        screen.getByText("Select and configure an orchestrator provider to enable saving."),
      ).not.toBeNull();
      expect(screen.getAllByLabelText("Provider")).toHaveLength(1);
      expect(screen.getAllByLabelText("Model")).toHaveLength(1);
      expect(screen.getAllByLabelText("Variant")).toHaveLength(1);
      expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    });

it("renders an empty orchestrator picker and keeps save disabled for a named profile after assigning it", async () => {
      const onEditAssignmentChange = vi.fn();

      function EditProfileHarness() {
        const [assignments, setAssignments] = useState({});

        return (
          <ProfilesClientView
            {...editProps}
            catalog={{ openai: { "gpt-4": ["high"] } }}
            editAssignments={assignments}
            onEditAssignmentChange={(key, assignment) => {
              onEditAssignmentChange(key, assignment);
              setAssignments((current) => ({ ...current, [key]: assignment }));
            }}
          />
        );
      }

      render(<EditProfileHarness />);

      // Only the orchestrator picker renders for a named profile.
      expect(screen.getAllByLabelText("Provider")).toHaveLength(1);
      expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);

      const user = userEvent.setup();
      await user.click(screen.getAllByLabelText("Provider")[0]);
      await user.click(screen.getByRole("option", { name: "openai" }));
      expect(onEditAssignmentChange).toHaveBeenLastCalledWith("sdd-orchestrator-alpha", {
        provider: "openai",
        model: "",
        variant: "",
      });

      await user.click(screen.getAllByLabelText("Model")[0]);
      await user.click(screen.getByRole("option", { name: "gpt-4" }));
      await user.click(screen.getAllByLabelText("Variant")[0]);
      await user.click(screen.getByRole("option", { name: "high" }));

      expect(onEditAssignmentChange).toHaveBeenLastCalledWith("sdd-orchestrator-alpha", {
        provider: "openai",
        model: "gpt-4",
        variant: "high",
      });
      // Named profile edits are retired: a complete assignment still cannot be saved.
      expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("keeps save disabled and never calls onEditSave for a named profile with a valid assignment", async () => {
      const onEditSave = vi.fn();
      render(
        <ProfilesClientView
          {...editProps}
          catalog={{ openai: { "gpt-4": ["high"] } }}
          editAssignments={{
            "sdd-orchestrator-alpha": { provider: "openai", model: "gpt-4", variant: "high" },
          }}
          onEditSave={onEditSave}
        />,
      );

      const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
      expect(save.disabled).toBe(true);
      await userEvent.click(save);
      expect(onEditSave).not.toHaveBeenCalled();
      expect(screen.getByText(/no longer available/i)).not.toBeNull();
    });
  });

  describe("edit base profile (empty name)", () => {
    it("allows selecting a provider and persists the assignment for the base orchestrator", async () => {
      const baseProps = {
        ...defaultProps,
        profiles: [{ name: "", displayName: "Gentle-Orchestrator", active: true, modelCount: 14, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "",
        catalog: { openai: { "gpt-4": ["high"] } },
      };

      const onEditAssignmentChange = vi.fn();

      function BaseEditHarness() {
        const [assignments, setAssignments] = useState<Record<string, { provider: string; model: string; variant: string }>>({});
        return (
          <ProfilesClientView
            {...baseProps}
            editAssignments={assignments}
            onEditAssignmentChange={(key, assignment) => {
              onEditAssignmentChange(key, assignment);
              setAssignments((current) => ({ ...current, [key]: assignment }));
            }}
          />
        );
      }

      render(<BaseEditHarness />);

      // The three selects of the OrchestratorPicker render for the base profile.
      expect(screen.getAllByLabelText("Provider")).toHaveLength(1);
      expect(screen.getAllByLabelText("Model")).toHaveLength(1);
      expect(screen.getAllByLabelText("Variant")).toHaveLength(1);

      const user = userEvent.setup();

      // Selecting a provider must target the base orchestrator key and update state.
      await user.click(screen.getByLabelText("Provider"));
      await user.click(screen.getByRole("option", { name: "openai" }));
      expect(onEditAssignmentChange).toHaveBeenLastCalledWith("gentle-orchestrator", {
        provider: "openai",
        model: "",
        variant: "",
      });

      // The controlled select must reflect the chosen provider so model becomes enabled.
      await user.click(screen.getByLabelText("Model"));
      await user.click(screen.getByRole("option", { name: "gpt-4" }));
      await user.click(screen.getByLabelText("Variant"));
      await user.click(screen.getByRole("option", { name: "high" }));

      expect(onEditAssignmentChange).toHaveBeenLastCalledWith("gentle-orchestrator", {
        provider: "openai",
        model: "gpt-4",
        variant: "high",
      });
      expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe("edit out-of-catalog assignments", () => {
    it("renders an out-of-catalog assignment with a badge and keeps it editable", () => {
      const editProps = {
        ...defaultProps,
        profiles: [{ name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "alpha",
        catalog: { openai: { "gpt-4": ["high"] } },
        editAssignments: {
          "sdd-orchestrator-alpha": { provider: "acme", model: "legacy-model", variant: "legacy" },
        },
      };

      render(<ProfilesClientView {...editProps} />);

      expect(screen.getByText("Outside catalog")).not.toBeNull();
      expect(screen.getByLabelText("Provider")).not.toBeNull();
    });

    it("does not show the badge for an assignment inside the catalog", () => {
      const editProps = {
        ...defaultProps,
        profiles: [{ name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "alpha",
        catalog: { openai: { "gpt-4": ["high"] } },
        editAssignments: {
          "sdd-orchestrator-alpha": { provider: "openai", model: "gpt-4", variant: "high" },
        },
      };

      render(<ProfilesClientView {...editProps} />);

      expect(screen.queryByText("Outside catalog")).toBeNull();
    });

    it("does not flag a no-variant model assignment as outside the catalog", () => {
      expect(
        isOutsideCatalog({ provider: "openai", model: "gpt-5", variant: "" }, {
          openai: { "gpt-4": ["high"], "gpt-5": [] },
        }),
      ).toBe(false);
    });

    it("renders the connected provider marker in the orchestrator picker provider list", async () => {
      const editProps = {
        ...defaultProps,
        profiles: [{ name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "alpha",
        catalog: { openai: { "gpt-4": ["high"] }, acme: { "x": ["a"] } },
        editAssignments: {},
        connectedProviders: ["openai"],
      };

      render(<ProfilesClientView {...editProps} />);

      await userEvent.click(screen.getByLabelText("Provider"));
      const option = screen.getByRole("option", { name: /openai/i });
      expect(option.querySelector('[title="Connected"]')).not.toBeNull();
    });

    it("shows the connected marker in the orchestrator provider trigger while the selector is closed", () => {
      const editProps = {
        ...defaultProps,
        profiles: [{ name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "alpha",
        catalog: { openai: { "gpt-4": ["high"] } },
        editAssignments: {
          "sdd-orchestrator-alpha": { provider: "openai", model: "gpt-4", variant: "high" },
        },
        connectedProviders: ["openai"],
      };

      render(<ProfilesClientView {...editProps} />);

      const trigger = screen.getByLabelText("Provider");
      expect(trigger.querySelector('[title="Connected"]')).not.toBeNull();
    });

    it("does not show the connected marker in the orchestrator provider trigger when not connected", () => {
      const editProps = {
        ...defaultProps,
        profiles: [{ name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "alpha",
        catalog: { openai: { "gpt-4": ["high"] } },
        editAssignments: {
          "sdd-orchestrator-alpha": { provider: "openai", model: "gpt-4", variant: "high" },
        },
        connectedProviders: [],
      };

      render(<ProfilesClientView {...editProps} />);

      const trigger = screen.getByLabelText("Provider");
      expect(trigger.querySelector('[title="Connected"]')).toBeNull();
    });

    it("sorts providers, models and variants deterministically in the orchestrator picker", async () => {
      const editProps = {
        ...defaultProps,
        profiles: [{ name: "alpha", displayName: "Alpha", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "alpha",
        catalog: { zebra: { "model-z": ["v2", "v1"] }, "alpha-prov": { "model-a": ["v1"] } },
        editAssignments: {},
      };

      render(<ProfilesClientView {...editProps} />);

      await userEvent.click(screen.getByLabelText("Provider"));
      const providerOptions = screen
        .getAllByRole("option")
        .map((o) => o.textContent?.trim());
      expect(providerOptions).toEqual(["alpha-prov", "zebra"]);
    });

    it("enables Base edit save when the model has no variants and no variant is selected", async () => {
      const editProps = {
        ...defaultProps,
        profiles: [{ name: "", displayName: "Gentle-Orchestrator", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" }],
        editingProfile: "",
        catalog: { openai: { "gpt-5": [] } },
        editAssignments: {
          "gentle-orchestrator": { provider: "openai", model: "gpt-5", variant: "" },
        },
      };

      render(<ProfilesClientView {...editProps} />);

      expect(
        (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });
  });
});

describe("filterAndSortProfiles (pure function)", () => {
  const base: ListingControlsState = { search: "", activeFilters: {}, sortField: "name", sortDir: "asc" };

  it("returns all when no search active", () => {
    expect(filterAndSortProfiles(profiles, base)).toHaveLength(3);
  });

  it("filters by name (case-insensitive)", () => {
    const r = filterAndSortProfiles(profiles, { ...base, search: "alpha" });
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("alpha");
  });

  it("filters by displayName (case-insensitive)", () => {
    const r = filterAndSortProfiles(profiles, { ...base, search: "Char" });
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("charlie");
  });

  it("returns empty when no match", () => {
    expect(filterAndSortProfiles(profiles, { ...base, search: "zzz" })).toHaveLength(0);
  });

  it("sorts by name asc", () => {
    const r = filterAndSortProfiles(profiles, { ...base, sortField: "name", sortDir: "asc" });
    expect(r.map((p) => p.name)).toEqual(["alpha", "bravo", "charlie"]);
  });

  it("sorts by name desc", () => {
    const r = filterAndSortProfiles(profiles, { ...base, sortField: "name", sortDir: "desc" });
    expect(r.map((p) => p.name)).toEqual(["charlie", "bravo", "alpha"]);
  });

  it("sorts by active desc (active profiles first, then by name)", () => {
    const r = filterAndSortProfiles(profiles, { ...base, sortField: "active", sortDir: "desc" });
    expect(r.map((p) => p.name)).toEqual(["alpha", "charlie", "bravo"]);
  });

  it("sorts by active asc (inactive first, then by name)", () => {
    const r = filterAndSortProfiles(profiles, { ...base, sortField: "active", sortDir: "asc" });
    expect(r.map((p) => p.name)).toEqual(["bravo", "alpha", "charlie"]);
  });

  it("combines search and sort", () => {
    const r = filterAndSortProfiles(profiles, { ...base, search: "a", sortField: "name", sortDir: "desc" });
    // "a" matches alpha, bravo, charlie (all contain 'a'); sorted name desc
    expect(r.map((p) => p.name)).toEqual(["charlie", "bravo", "alpha"]);
  });

  it("sorts by updatedAt desc (most recently updated first)", () => {
    const r = filterAndSortProfiles(profiles, { ...base, sortField: "updatedAt", sortDir: "desc" });
    // bravo (2026-03-20) > charlie (2026-02-10) > alpha (2026-01-15)
    expect(r.map((p) => p.name)).toEqual(["bravo", "charlie", "alpha"]);
  });

  it("sorts by updatedAt asc (oldest first)", () => {
    const r = filterAndSortProfiles(profiles, { ...base, sortField: "updatedAt", sortDir: "asc" });
    // alpha (2026-01-15) < charlie (2026-02-10) < bravo (2026-03-20)
    expect(r.map((p) => p.name)).toEqual(["alpha", "charlie", "bravo"]);
  });

  it("sorts by updatedAt with identical timestamps falls back to name", () => {
    const sameTime: Profile[] = [
      { name: "zeta", displayName: "Zeta", active: true, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" },
      { name: "alpha", displayName: "Alpha", active: false, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z" },
    ];
    const r = filterAndSortProfiles(sameTime, { ...base, sortField: "updatedAt", sortDir: "desc" });
    expect(r.map((p) => p.name)).toEqual(["alpha", "zeta"]);
  });
});

describe("isOutsideCatalog (pure function)", () => {
  const catalog = { openai: { "gpt-4": ["high", "low"] } };

  it("flags an assignment whose provider is not in the catalog", () => {
    expect(
      isOutsideCatalog({ provider: "acme", model: "legacy", variant: "legacy" }, catalog),
    ).toBe(true);
  });

  it("flags an assignment whose model is not in the catalog", () => {
    expect(
      isOutsideCatalog({ provider: "openai", model: "missing-model", variant: "high" }, catalog),
    ).toBe(true);
  });

  it("flags an assignment whose variant is not in the catalog", () => {
    expect(
      isOutsideCatalog({ provider: "openai", model: "gpt-4", variant: "bogus" }, catalog),
    ).toBe(true);
  });

  it("does not flag an assignment fully present in the catalog", () => {
    expect(
      isOutsideCatalog({ provider: "openai", model: "gpt-4", variant: "high" }, catalog),
    ).toBe(false);
  });

  it("does not flag an empty assignment", () => {
    expect(isOutsideCatalog({ provider: "", model: "", variant: "" }, catalog)).toBe(false);
  });
});

describe("orchestratorAgentKey (pure function)", () => {
  it("maps the base profile (empty name) to the global orchestrator agent", () => {
    expect(orchestratorAgentKey("")).toBe("gentle-orchestrator");
  });

  it("maps a named profile to its sdd-orchestrator key", () => {
    expect(orchestratorAgentKey("alpha")).toBe("sdd-orchestrator-alpha");
  });
});

describe("ProfilesClientView retired repair", () => {
  const baseProps = {
    catalog: {},
    catalogLoading: false,
    loading: false,
    error: null,
    pendingAction: null,
    newAssignments: {},
    onAssignmentChange: vi.fn(),
    onSwitch: vi.fn(),
    onDeleteStart: vi.fn(),
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
    deleteConfirmProfile: null,
    editingProfile: null,
    editAssignments: {},
    detailLoading: false,
    detailError: null,
    onEditStart: vi.fn(),
    onEditSave: vi.fn(),
    onEditCancel: vi.fn(),
    onEditAssignmentChange: vi.fn(),
  };
  const incompleteProps = {
    ...baseProps,
    profiles: [
      { name: "alpha", displayName: "Alpha", active: false, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z", incomplete: true, strategy: "generated-multi" as const },
      { name: "bravo", displayName: "Bravo", active: false, modelCount: 1, updatedAt: "2026-01-01T00:00:00.000Z", incomplete: false, strategy: "generated-multi" as const },
    ],
  };

  beforeEach(() => {
    setLocale("en");
  });

  it("offers no Repair button and no Incomplete badge, and shows the retired notice instead", () => {
    render(<ProfilesClientView {...incompleteProps} />);

    expect(screen.queryByRole("button", { name: /repair/i })).toBeNull();
    expect(screen.queryByText("Incomplete")).toBeNull();
    expect(screen.getByText(/no longer available/i)).not.toBeNull();
  });

  it("keeps switch and delete available for incomplete profiles", async () => {
    const onSwitch = vi.fn();
    const onDeleteStart = vi.fn();
    render(
      <ProfilesClientView
        {...incompleteProps}
        onSwitch={onSwitch}
        onDeleteStart={onDeleteStart}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: /switch/i })[0]);
    await userEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    expect(onSwitch).toHaveBeenCalledWith("alpha");
    expect(onDeleteStart).toHaveBeenCalledWith("alpha");
  });
});

describe("ProfilesClientView strategy read-only banner", () => {
  const baseProps = {
    profiles: [],
    catalog: {},
    catalogLoading: false,
    loading: false,
    error: null,
    pendingAction: null,
    newAssignments: {},
    onAssignmentChange: vi.fn(),
    onCreate: vi.fn(),
    onSwitch: vi.fn(),
    onDeleteStart: vi.fn(),
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
    deleteConfirmProfile: null,
    editingProfile: null,
    editAssignments: {},
    detailLoading: false,
    detailError: null,
    onEditStart: vi.fn(),
    onEditSave: vi.fn(),
    onEditCancel: vi.fn(),
    onEditAssignmentChange: vi.fn(),
  };

  it("renders a read-only banner when strategy is external-single-active", () => {
    render(
      <ProfilesClientView
        {...baseProps}
        strategy="external-single-active"
      />,
    );

    expect(screen.getByText(/read.?only/i)).not.toBeNull();
  });

  it("renders a read-only banner when strategy is unknown", () => {
    render(
      <ProfilesClientView
        {...baseProps}
        strategy="unknown"
      />,
    );

    expect(screen.getByText(/read.?only/i)).not.toBeNull();
  });

  it("does not render a read-only banner for generated-multi", () => {
    render(
      <ProfilesClientView
        {...baseProps}
        strategy="generated-multi"
      />,
    );

    expect(screen.queryByText(/read.?only/i)).toBeNull();
  });
});
