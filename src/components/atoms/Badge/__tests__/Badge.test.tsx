import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, mapBadgeVariant } from "@/components/atoms/Badge/Badge";

describe("Badge", () => {
  it("renders the badge text", () => {
    render(<Badge>Active</Badge>);

    expect(screen.getByText("Active")).not.toBeNull();
  });

  it("maps atom variants to ui/badge variants", () => {
    expect(mapBadgeVariant("success")).toBe("secondary");
    expect(mapBadgeVariant("warning")).toBe("outline");
    expect(mapBadgeVariant("error")).toBe("destructive");
    expect(mapBadgeVariant("info")).toBe("default");
    expect(mapBadgeVariant(undefined)).toBe("default");
  });

  it("renders a pulsing dot when pulsing is true", () => {
    render(<Badge pulsing>Active</Badge>);

    const badge = screen.getByText("Active").parentElement;
    const dot = badge?.querySelector("span");
    expect(dot).not.toBeNull();
    expect(dot?.classList.contains("animate-pulse")).toBe(true);
  });

  it("does not render a pulsing dot when pulsing is false", () => {
    render(<Badge>Active</Badge>);

    const badge = screen.getByText("Active").parentElement;
    const dot = badge?.querySelector("span");
    expect(dot).toBeNull();
  });
});
