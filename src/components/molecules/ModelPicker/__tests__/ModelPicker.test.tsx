import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelPicker } from "../ModelPicker";
import { t, setLocale } from "@/resources/resources";

describe("ModelPicker", () => {
  const catalog = {
    openai: { "gpt-4": ["low", "high"] },
  };

  beforeEach(() => {
    setLocale("en");
  });

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

  it("renders Spanish labels when locale is es", async () => {
    setLocale("es");
    const onConfirm = vi.fn();
    render(<ModelPicker catalog={catalog} onConfirm={onConfirm} />);

    expect(screen.getByLabelText("Proveedor")).toBeDefined();
    expect(screen.getByLabelText("Modelo")).toBeDefined();
    expect(screen.getByLabelText("Variante")).toBeDefined();

    await userEvent.selectOptions(screen.getByLabelText("Proveedor"), "openai");
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-4");
    await userEvent.selectOptions(screen.getByLabelText("Variante"), "high");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        provider: "openai",
        model: "gpt-4",
        variant: "high",
      });
    });
  });
});
