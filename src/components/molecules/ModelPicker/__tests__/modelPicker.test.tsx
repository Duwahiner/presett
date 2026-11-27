import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelPicker } from "../modelPicker";
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

  it("shows the connected marker for a connected provider and hides it otherwise", async () => {
    render(
      <ModelPicker
        catalog={catalog}
        connectedProviders={["openai"]}
        onConfirm={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));

    const option = screen.getByRole("option", { name: /openai/i });
    expect(option.querySelector('[title="Connected"]')).not.toBeNull();
  });

  it("shows the connected marker in the trigger while the selector is closed", () => {
    render(
      <ModelPicker
        catalog={catalog}
        connectedProviders={["openai"]}
        initialProvider="openai"
        onConfirm={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /provider/i });
    expect(trigger.querySelector('[title="Connected"]')).not.toBeNull();
  });

  it("does not show the connected marker in the trigger when the provider is not connected", () => {
    render(
      <ModelPicker
        catalog={catalog}
        connectedProviders={[]}
        initialProvider="openai"
        onConfirm={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /provider/i });
    expect(trigger.querySelector('[title="Connected"]')).toBeNull();
  });

  it("sorts variants deterministically regardless of catalog order", async () => {
    const unorderedCatalog = {
      openai: { "gpt-4": ["zeta", "alpha", "mid"] },
    };
    render(<ModelPicker catalog={unorderedCatalog} onConfirm={vi.fn()} />);

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));
    await userEvent.click(screen.getByRole("option", { name: "openai" }));
    await userEvent.click(screen.getByRole("combobox", { name: /model/i }));
    await userEvent.click(screen.getByRole("option", { name: "gpt-4" }));
    await userEvent.click(screen.getByRole("combobox", { name: /variant/i }));

    const options = screen.getAllByRole("option").map((o) => o.textContent?.trim());
    const variantOptions = options.filter((o) =>
      ["alpha", "mid", "zeta"].includes(o ?? ""),
    );
    expect(variantOptions).toEqual(["alpha", "mid", "zeta"]);
  });

  it("enables confirm for a model without variants even when no variant is selected", async () => {
    const noVariantCatalog = { openai: { "gpt-5": [] } };
    const onConfirm = vi.fn();
    render(<ModelPicker catalog={noVariantCatalog} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));
    await userEvent.click(screen.getByRole("option", { name: "openai" }));
    await userEvent.click(screen.getByRole("combobox", { name: /model/i }));
    await userEvent.click(screen.getByRole("option", { name: "gpt-5" }));

    const save = screen.getByRole("button", { name: /save/i });
    expect((save as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(save);
    expect(onConfirm).toHaveBeenCalledWith({
      provider: "openai",
      model: "gpt-5",
      variant: "",
    });
  });

  it("keeps confirm disabled when a variant is required but not selected", async () => {
    render(<ModelPicker catalog={catalog} onConfirm={vi.fn()} />);

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));
    await userEvent.click(screen.getByRole("option", { name: "openai" }));
    await userEvent.click(screen.getByRole("combobox", { name: /model/i }));
    await userEvent.click(screen.getByRole("option", { name: "gpt-4" }));

    const save = screen.getByRole("button", { name: /save/i });
    expect((save as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows OpenCode Zen label and marker when the `opencode` catalog id is connected", async () => {
    const zenCatalog = { opencode: { "qwen3-max": ["high"] } };
    const onConfirm = vi.fn();
    render(
      <ModelPicker
        catalog={zenCatalog}
        connectedProviders={["opencode"]}
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));

    const option = screen.getByRole("option", { name: "OpenCode Zen" });
    expect(option).not.toBeNull();
    // The visible label is the product name, not the raw id.
    expect(option.textContent).toContain("OpenCode Zen");
    // Connected marker is visible for the correlated opencode provider.
    expect(option.querySelector('[title="Connected"]')).not.toBeNull();

    await userEvent.click(option);
    await userEvent.click(screen.getByRole("combobox", { name: /model/i }));
    await userEvent.click(screen.getByRole("option", { name: "qwen3-max" }));
    await userEvent.click(screen.getByRole("combobox", { name: /variant/i }));
    await userEvent.click(screen.getByRole("option", { name: "high" }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        provider: "opencode",
        model: "qwen3-max",
        variant: "high",
      });
    });
  });

  it("shows OpenCode label without marker when no auth is connected", async () => {
    const zenCatalog = { opencode: { "qwen3-max": ["high"] } };
    render(<ModelPicker catalog={zenCatalog} onConfirm={vi.fn()} />);

    await userEvent.click(screen.getByRole("combobox", { name: /provider/i }));

    const option = screen.getByRole("option", { name: "OpenCode" });
    expect(option).not.toBeNull();
    expect(option.textContent).toContain("OpenCode");
    // No auth signal → no marker for the opencode provider.
    expect(option.querySelector('[title="Connected"]')).toBeNull();
  });
});
