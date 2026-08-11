import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/atoms/Card/Card";

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
});
