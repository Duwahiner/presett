import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/atoms/Card/card";

describe("Card", () => {
  it("renders the title and children", () => {
    render(
      <Card title="Models">
        <p>Model placeholder content</p>
      </Card>,
    );

    expect(screen.queryByText("Models")).not.toBeNull();
    expect(screen.queryByText("Model placeholder content")).not.toBeNull();
  });

  it("composes title inside a header section separate from content", () => {
    render(
      <Card title="Models">
        <p data-testid="card-child">Model placeholder content</p>
      </Card>,
    );

    const title = screen.getByText("Models");
    const child = screen.getByTestId("card-child");

    // Title and child should be in separate sibling containers (header vs content).
    expect(title.parentElement).not.toBe(child.parentElement);
    expect(title.parentElement?.parentElement).toBe(child.parentElement?.parentElement);
  });

  it("merges custom className on the root card", () => {
    render(
      <Card title="Models" className="my-card">
        <p>Model placeholder content</p>
      </Card>,
    );

    const title = screen.getByText("Models");
    const root = title.parentElement?.parentElement;
    expect(root?.classList.contains("my-card")).toBe(true);
  });
});
