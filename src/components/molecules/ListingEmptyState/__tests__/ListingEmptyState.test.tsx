import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingEmptyState } from "../ListingEmptyState";
import { setLocale } from "@/resources/resources";

describe("ListingEmptyState", () => {
  beforeEach(() => setLocale("en"));

  it.each([
    ["models", "no-data", /no model assignments/i],
    ["profiles", "no-data", /no profiles yet/i],
    ["backups", "no-data", /no backups found/i],
    ["models", "no-matches", /no matching models/i],
    ["profiles", "no-matches", /no matching profiles/i],
    ["backups", "no-matches", /no matching backups/i],
  ] as const)("renders %s %s title", (entity, variant, expected) => {
    render(<ListingEmptyState variant={variant} entity={entity} />);
    expect(screen.getByText(expected)).toBeDefined();
  });

  it("shows clear button only for no-matches and calls onClear", async () => {
    const onClear = vi.fn();
    const { rerender } = render(<ListingEmptyState variant="no-data" entity="models" />);
    expect(screen.queryByRole("button", { name: /clear/i })).toBeNull();
    rerender(<ListingEmptyState variant="no-matches" entity="models" onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("renders Spanish copy", () => {
    setLocale("es");
    render(<ListingEmptyState variant="no-data" entity="models" />);
    expect(screen.getByText(/no hay asignaciones de modelos/i)).toBeDefined();
  });
});
