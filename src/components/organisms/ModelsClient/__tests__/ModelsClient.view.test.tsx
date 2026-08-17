import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelsClientView } from "../ModelsClient.view";
import { filterAndSortModels } from "../ModelsClient";
import { setLocale } from "@/resources/resources";
import type { ModelsClientViewProps, Assignment } from "../ModelsClient.types";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/ListingControls.types";

const assignments: Assignment[] = [
  { agentKey: "coder", provider: "openai", model: "gpt-5", variant: "high" },
  { agentKey: "researcher", provider: "anthropic", model: "claude-4", variant: "standard" },
  { agentKey: "writer", provider: "openai", model: "gpt-4o", variant: "high" },
];

const modelsConfig: ListingControlsConfig = {
  filters: [
    {
      key: "agent",
      labelKey: "listing_filter_agent",
      options: [
        { value: "coder", labelKey: "listing_filter_agent_openai" },
        { value: "researcher", labelKey: "listing_filter_agent_anthropic" },
      ],
    },
    {
      key: "provider",
      labelKey: "listing_filter_provider",
      options: [
        { value: "openai", labelKey: "listing_filter_agent_openai" },
        { value: "anthropic", labelKey: "listing_filter_agent_anthropic" },
      ],
    },
  ],
  sort: {
    fields: [
      { value: "agent", labelKey: "listing_sort_agent" },
      { value: "provider", labelKey: "listing_sort_provider" },
      { value: "model", labelKey: "listing_sort_model" },
      { value: "variant", labelKey: "listing_sort_variant" },
    ],
    defaultField: "agent",
    defaultDir: "asc",
  },
};

const defaultControlsState: ListingControlsState = {
  search: "",
  activeFilters: {},
  sortField: "agent",
  sortDir: "asc",
};

describe("ModelsClientView", () => {
  beforeEach(() => {
    setLocale("en");
  });

  const defaultProps: ModelsClientViewProps = {
    assignments: [],
    catalog: { openai: { "gpt-5": ["high"] } },
    loading: false,
    error: null,
    saving: null,
    profiles: [],
    activeProfile: "default",
    syncing: false,
    switchingProfile: false,
    resetting: false,
    onSave: vi.fn(),
    onSwitchProfile: vi.fn(),
    onSync: vi.fn(),
    onReset: vi.fn(),
  };

  it("renders a meaningful empty state when no assignments exist", () => {
    render(<ModelsClientView {...defaultProps} />);

    expect(screen.getByText("No agent assignments found")).not.toBeNull();
    expect(screen.getByText(/sync configs or create/i)).not.toBeNull();
  });

  it("does not render inline mutation feedback", () => {
    render(<ModelsClientView {...defaultProps} />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  describe("filtering", () => {
    it("renders only assignments matching the agent filter", () => {
      render(
        <ModelsClientView
          {...defaultProps}
          assignments={assignments}
          derivedAssignments={assignments.filter((a) => a.agentKey === "coder")}
          controls={modelsConfig}
          controlsState={{ ...defaultControlsState, activeFilters: { agent: "coder" } }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      // AgentAssignmentRow renders agentKey in an h4 with aria-label
      const agentHeadings = screen.getAllByRole("heading", { level: 4 });
      const agentNames = agentHeadings.map((h) => h.textContent?.trim());
      expect(agentNames).toEqual(["coder"]);
      expect(screen.queryByText("researcher")).toBeNull();
      expect(screen.queryByText("writer")).toBeNull();
    });

    it("narrows results when multiple filters are combined", () => {
      const filtered = assignments.filter(
        (a) => a.provider === "openai" && a.variant === "high",
      );

      render(
        <ModelsClientView
          {...defaultProps}
          assignments={assignments}
          derivedAssignments={filtered}
          controls={modelsConfig}
          controlsState={{
            ...defaultControlsState,
            activeFilters: { provider: "openai", variant: "high" },
          }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      const agentHeadings = screen.getAllByRole("heading", { level: 4 });
      const agentNames = agentHeadings.map((h) => h.textContent?.trim());
      expect(agentNames).toContain("coder");
      expect(agentNames).toContain("writer");
      expect(agentNames).not.toContain("researcher");
    });
  });

  describe("sorting", () => {
    it("sorts assignments by provider ascending", () => {
      const sorted = [...assignments].sort((a, b) => a.provider.localeCompare(b.provider));

      render(
        <ModelsClientView
          {...defaultProps}
          assignments={assignments}
          derivedAssignments={sorted}
          controls={modelsConfig}
          controlsState={{ ...defaultControlsState, sortField: "provider", sortDir: "asc" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      const agentHeadings = screen.getAllByRole("heading", { level: 4 });
      const agentNames = agentHeadings.map((h) => h.textContent?.trim());
      expect(agentNames).toEqual(["researcher", "coder", "writer"]);
    });

    it("sorts assignments by provider descending", () => {
      const sorted = [...assignments].sort((a, b) => b.provider.localeCompare(a.provider));

      render(
        <ModelsClientView
          {...defaultProps}
          assignments={assignments}
          derivedAssignments={sorted}
          controls={modelsConfig}
          controlsState={{ ...defaultControlsState, sortField: "provider", sortDir: "desc" }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      const agentHeadings = screen.getAllByRole("heading", { level: 4 });
      const agentNames = agentHeadings.map((h) => h.textContent?.trim());
      expect(agentNames).toEqual(["coder", "writer", "researcher"]);
    });
  });

  describe("empty states", () => {
    it("shows no-data variant when original array is empty", () => {
      render(
        <ModelsClientView
          {...defaultProps}
          assignments={[]}
          derivedAssignments={[]}
          controls={modelsConfig}
          controlsState={defaultControlsState}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      expect(screen.getByText("No model assignments")).not.toBeNull();
    });

    it("shows no-matches variant when filters remove all items", () => {
      render(
        <ModelsClientView
          {...defaultProps}
          assignments={assignments}
          derivedAssignments={[]}
          controls={modelsConfig}
          controlsState={{
            ...defaultControlsState,
            activeFilters: { agent: "nonexistent" },
          }}
          onControlsChange={vi.fn()}
          onControlsClear={vi.fn()}
        />,
      );

      expect(screen.getByText("No matching models")).not.toBeNull();
    });
  });
});

describe("filterAndSortModels (pure function)", () => {
  const base: ListingControlsState = { search: "", activeFilters: {}, sortField: "agent", sortDir: "asc" };

  it("returns all when no filters active", () => {
    expect(filterAndSortModels(assignments, base)).toHaveLength(3);
  });

  it("filters by agent", () => {
    const r = filterAndSortModels(assignments, { ...base, activeFilters: { agent: "coder" } });
    expect(r).toHaveLength(1);
    expect(r[0].agentKey).toBe("coder");
  });

  it("combines multiple filters", () => {
    const r = filterAndSortModels(assignments, { ...base, activeFilters: { provider: "openai", variant: "high" } });
    expect(r.map((a) => a.agentKey)).toEqual(["coder", "writer"]);
  });

  it("returns empty when no match", () => {
    expect(filterAndSortModels(assignments, { ...base, activeFilters: { agent: "zzz" } })).toHaveLength(0);
  });

  it("sorts by provider asc with agentKey fallback", () => {
    const r = filterAndSortModels(assignments, { ...base, sortField: "provider", sortDir: "asc" });
    expect(r.map((a) => a.agentKey)).toEqual(["researcher", "coder", "writer"]);
  });

  it("sorts by provider desc", () => {
    const r = filterAndSortModels(assignments, { ...base, sortField: "provider", sortDir: "desc" });
    expect(r.map((a) => a.provider)).toEqual(["openai", "openai", "anthropic"]);
  });
});
