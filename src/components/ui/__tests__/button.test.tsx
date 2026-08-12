import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button primitive", () => {
  it("renders a default button", () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole("button", { name: "Default" })).not.toBeNull();
  });

  it("renders as an anchor via the render prop", () => {
    render(
      <Button render={<a href="/dashboard" />}>
        Dashboard
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Dashboard" });
    expect(button).not.toBeNull();
    expect(button.tagName).toBe("A");
    expect(button.getAttribute("href")).toBe("/dashboard");
  });

  it.each([
    ["default", "Default"],
    ["destructive", "Destructive"],
    ["outline", "Outline"],
    ["ghost", "Ghost"],
    ["link", "Link"],
    ["secondary", "Secondary"],
  ] as const)("renders the %s variant", (variant, label) => {
    render(<Button variant={variant}>{label}</Button>);
    expect(screen.getByRole("button", { name: label })).not.toBeNull();
  });

  it.each([
    ["sm", "Small"],
    ["default", "Default"],
    ["lg", "Large"],
    ["icon", "Icon"],
  ] as const)("renders the %s size", (size, label) => {
    render(<Button size={size}>{label}</Button>);
    expect(screen.getByRole("button", { name: label })).not.toBeNull();
  });
});
