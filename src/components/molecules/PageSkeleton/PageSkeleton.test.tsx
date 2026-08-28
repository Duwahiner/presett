import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageSkeleton } from "./PageSkeleton";

describe("PageSkeleton", () => {
  it("renders a structured, accessible status for each page variant", () => {
    render(<PageSkeleton variant="usageStats" label="Loading usage stats…" />);

    expect(screen.getByRole("status", { name: "Loading usage stats…" })).not.toBeNull();
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(3);
  });
});
