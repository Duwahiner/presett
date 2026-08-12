import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/components/ui/select";

const items = {
  one: "Option 1",
  two: "Option 2",
};

describe("Select primitive", () => {
  it("renders the trigger with the selected value label", () => {
    render(
      <Select.Root defaultValue="one" items={items}>
        <Select.Trigger aria-label="Choose an option">
          <Select.Value />
        </Select.Trigger>
      </Select.Root>,
    );

    expect(screen.getByRole("combobox").textContent).toBe("Option 1");
  });

  it("displays the available options when opened", async () => {
    render(
      <Select.Root defaultValue="one" items={items}>
        <Select.Trigger aria-label="Choose an option">
          <Select.Value />
        </Select.Trigger>
        <Select.Positioner>
          <Select.Popup>
            <Select.Item value="one">
              <Select.ItemText>Option 1</Select.ItemText>
            </Select.Item>
            <Select.Item value="two">
              <Select.ItemText>Option 2</Select.ItemText>
            </Select.Item>
          </Select.Popup>
        </Select.Positioner>
      </Select.Root>,
    );

    await userEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "Option 1" })).not.toBeNull();
    expect(screen.getByRole("option", { name: "Option 2" })).not.toBeNull();
  });
});
