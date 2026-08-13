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

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));
    await userEvent.click(screen.getByRole("option", { name: "openai" }));

    await userEvent.click(screen.getByRole("combobox", { name: /model/i }));
    await userEvent.click(screen.getByRole("option", { name: "gpt-4" }));

    await userEvent.click(screen.getByRole("combobox", { name: /variant/i }));
    await userEvent.click(screen.getByRole("option", { name: "high" }));

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        provider: "openai",
        model: "gpt-4",
        variant: "high",
      });
    });
  });

  it("keeps the save action compact instead of full width", () => {
    render(
      <ModelPicker
        catalog={catalog}
        initialProvider="openai"
        initialModel="gpt-4"
        initialVariant="high"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /save/i }).className).not.toContain(
      "w-full",
    );
  });

  it("resets model and variant when provider changes", async () => {
    const onConfirm = vi.fn();
    render(<ModelPicker catalog={catalog} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));
    await userEvent.click(screen.getByRole("option", { name: "openai" }));

    await userEvent.click(screen.getByRole("combobox", { name: /model/i }));
    await userEvent.click(screen.getByRole("option", { name: "gpt-4" }));

    await userEvent.click(screen.getByRole("combobox", { name: /variant/i }));
    await userEvent.click(screen.getByRole("option", { name: "high" }));

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));
    await userEvent.click(screen.getByRole("option", { name: "openai" }));

    expect(screen.getByRole("combobox", { name: /model/i }).textContent).toContain(
      t("modelPicker_model"),
    );
    expect(
      screen.getByRole("combobox", { name: /variant/i }).textContent,
    ).toContain(t("modelPicker_variant"));
  });

  it("renders Spanish labels when locale is es", async () => {
    setLocale("es");
    render(<ModelPicker catalog={catalog} onConfirm={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: /proveedor/i })).toBeDefined();
    expect(screen.getByRole("combobox", { name: /modelo/i })).toBeDefined();
    expect(screen.getByRole("combobox", { name: /variante/i })).toBeDefined();
  });
});
