import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/atoms/Button/Button";

describe("Button", () => {
  it("renders a button with the provided label", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button", { name: "Click me" })).not.toBeNull();
  });

  it("renders as a child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/dashboard">Dashboard</a>
      </Button>,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).not.toBeNull();
  });
});
