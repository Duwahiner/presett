import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelPicker } from "../ModelPicker";

describe("ModelPicker", () => {
  const catalog = {
    openai: { "gpt-4": ["low", "high"] },
  };

  it("selects provider, model, variant and confirms", async () => {
    const onConfirm = vi.fn();
    render(<ModelPicker catalog={catalog} onConfirm={onConfirm} />);

    await userEvent.selectOptions(screen.getByLabelText("Provider"), "openai");
    await userEvent.selectOptions(screen.getByLabelText("Model"), "gpt-4");
    await userEvent.selectOptions(screen.getByLabelText("Variant"), "high");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        provider: "openai",
        model: "gpt-4",
        variant: "high",
      });
    });
  });
});
