import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingControls } from "../ListingControls";
import type { ListingControlsConfig, ListingControlsState } from "../ListingControls.types";
import { setLocale } from "@/resources/resources";

const sortConfig: ListingControlsConfig = {
  search: { placeholder: "listing_search_placeholder", ariaLabel: "listing_search_aria" },
  sort: { fields: [{ value: "name", labelKey: "listing_sort_name" }], defaultField: "name", defaultDir: "asc" },
};

const emptyState: ListingControlsState = { search: "", activeFilters: {}, sortField: "name", sortDir: "asc" };

describe("ListingControls", () => {
  beforeEach(() => setLocale("en"));

  it("renders search and sort controls with accessible labels", () => {
    render(<ListingControls config={sortConfig} state={emptyState} onChange={vi.fn()} onClear={vi.fn()} resultCount={5} />);
    expect(screen.getByRole("textbox", { name: /search/i })).toBeDefined();
    expect(screen.getByRole("combobox", { name: /sort/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sort direction/i })).toBeDefined();
  });

  it("fires onChange on search typing and direction toggle", async () => {
    const onChange = vi.fn();
    render(<ListingControls config={sortConfig} state={emptyState} onChange={onChange} onClear={vi.fn()} resultCount={5} />);
    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "x");
    expect(onChange).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /sort direction/i }));
    expect(onChange).toHaveBeenLastCalledWith({ sortDir: "desc" });
  });

  it("shows filter count and clear when filters active", async () => {
    const onClear = vi.fn();
    const state: ListingControlsState = { ...emptyState, activeFilters: { agent: "o" } };
    render(<ListingControls config={sortConfig} state={state} onChange={vi.fn()} onClear={onClear} resultCount={3} />);
    expect(screen.getByText(/1/)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("renders filter selectors from config and fires onChange", async () => {
    const onChange = vi.fn();
    const config: ListingControlsConfig = {
      ...sortConfig,
      filters: [{ key: "a", labelKey: "listing_filter_agent", options: [{ value: "openai", labelKey: "listing_filter_agent_openai" }] }],
    };
    render(<ListingControls config={config} state={emptyState} onChange={onChange} onClear={vi.fn()} resultCount={5} />);
    await userEvent.click(screen.getByRole("combobox", { name: /agent/i }));
    await userEvent.click(screen.getByRole("option", { name: /openai/i }));
    expect(onChange).toHaveBeenCalledWith({ activeFilters: { a: "openai" } });
  });

  it("renders Spanish labels when locale is es", () => {
    setLocale("es");
    render(<ListingControls config={sortConfig} state={emptyState} onChange={vi.fn()} onClear={vi.fn()} resultCount={5} />);
    expect(screen.getByRole("textbox", { name: /buscar/i })).toBeDefined();
  });
});
