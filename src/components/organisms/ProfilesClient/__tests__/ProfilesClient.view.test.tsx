import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilesClientView } from "../ProfilesClient.view";
import { filterAndSortProfiles } from "../ProfilesClient";
import { setLocale } from "@/resources/resources";
import type { ProfilesClientViewProps, Profile } from "../ProfilesClient.types";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/ListingControls.types";

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
    onEditStart: vi.fn(),
    onEditSave: vi.fn(),
    onEditCancel: vi.fn(),
    onEditAssignmentChange: vi.fn(),
  };

  it("renders the create profile button using Button primitive", () => {
    render(<ProfilesClientView {...defaultProps} />);

    const createBtn = screen.getByRole("button", { name: /create profile/i });
    expect(createBtn).not.toBeNull();
    expect(createBtn.tagName).toBe("BUTTON");
  });

  it("shows form and input when clicking create button", async () => {
    render(<ProfilesClientView {...defaultProps} />);

    await userEvent.click(screen.getByText("Create Profile"));

    expect(screen.queryByPlaceholderText("Profile name")).not.toBeNull();
  });

  it("updates the input value when typing", async () => {
    render(<ProfilesClientView {...defaultProps} />);

    await userEvent.click(screen.getByText("Create Profile"));
    await userEvent.type(screen.getByPlaceholderText("Profile name"), "work");

    const input = screen.getByPlaceholderText("Profile name") as HTMLInputElement;
    expect(input.value).toBe("work");
  });

  it("describes the profile name rules and disabled create state", async () => {
    render(<ProfilesClientView {...defaultProps} />);

    await userEvent.click(screen.getByText("Create Profile"));

    expect(screen.getByText("Profile name")).not.toBeNull();
    expect(screen.getByRole("button", { name: "SAVE PROFILE" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "CANCEL" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).not.toBeNull();
  });

  it("passes the submitted profile name directly to the creation handler", async () => {
    const onCreate = vi.fn();
    render(<ProfilesClientView {...defaultProps} onCreate={onCreate} />);

    await userEvent.click(screen.getByText("Create Profile"));
    await userEvent.type(screen.getByPlaceholderText("Profile name"), "  work  ");
    await userEvent.click(screen.getByRole("button", { name: "SAVE PROFILE" }));

    expect(onCreate).toHaveBeenCalledWith("work");
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
