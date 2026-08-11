import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "@/components/ui/tooltip";

describe("Tooltip primitive", () => {
  it("renders the tooltip content when open", () => {
    render(
      <Tooltip.Provider>
        <Tooltip.Root open>
          <Tooltip.Trigger>Hover me</Tooltip.Trigger>
          <Tooltip.Content>Tooltip content</Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>,
    );

    expect(screen.getByText("Tooltip content")).not.toBeNull();
  });
});
