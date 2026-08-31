import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Button,
  mapButtonVariant,
  mapButtonSize,
} from "@/components/atoms/Button/button";

describe("Button", () => {
  it("renders a button with the provided label", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button", { name: "Click me" })).not.toBeNull();
  });

  it("renders as the provided element when render prop is used", () => {
    render(
      <Button render={<a href="/dashboard" />}>
        Dashboard
      </Button>,
    );

    const element = screen.getByRole("button", { name: "Dashboard" });
    expect(element.tagName).toBe("A");
    expect(element.getAttribute("href")).toBe("/dashboard");
  });

  it("maps atom variants to ui/button variants", () => {
    expect(mapButtonVariant("primary")).toBe("default");
    expect(mapButtonVariant("ghost")).toBe("ghost");
    expect(mapButtonVariant("danger")).toBe("destructive");
    expect(mapButtonVariant(undefined)).toBe("default");
  });

  it("maps atom sizes to ui/button sizes", () => {
    expect(mapButtonSize("sm")).toBe("sm");
    expect(mapButtonSize("md")).toBe("default");
    expect(mapButtonSize("lg")).toBe("lg");
    expect(mapButtonSize(undefined)).toBe("default");
  });
});
