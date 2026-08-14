import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalConfigClient, resolveDisplayLocale } from "../GlobalConfigClient";

const { getGlobalConfig, patchGlobalConfig } = vi.hoisted(() => ({ getGlobalConfig: vi.fn(), patchGlobalConfig: vi.fn() }));
vi.mock("@/services/globalConfigApiService", () => ({ getGlobalConfig, patchGlobalConfig }));

describe("GlobalConfigClient runtime behavior", () => {
  it("renders both sections with defaults and saves each domain independently", async () => {
    getGlobalConfig.mockResolvedValueOnce({ assignments: [], gentleAi: {} });
    patchGlobalConfig.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<GlobalConfigClient />);

    expect(screen.getByRole("heading", { name: "Gentle-AI" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "OpenCode" })).toBeTruthy();
    await user.type(screen.getByLabelText("Persona"), "Builder");
    await user.click(screen.getByRole("button", { name: "Save Gentle-AI" }));
    await waitFor(() => expect(patchGlobalConfig).toHaveBeenCalledWith({ domain: "gentle-ai", language: "en", persona: "Builder" }));
    expect(screen.getByRole("status").textContent).toContain("Gentle-AI configuration saved");
  });

  it("shows the active OpenCode model and persists only the OpenCode section", async () => {
    getGlobalConfig.mockResolvedValueOnce({ defaultAgent: "main", assignments: [{ agentKey: "main", provider: "openai", model: "gpt-5", variant: "high" }], gentleAi: { language: "es" } });
    patchGlobalConfig.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<GlobalConfigClient />);
    await waitFor(() => expect(screen.getByDisplayValue("openai/gpt-5")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Save OpenCode" }));
    await waitFor(() => expect(patchGlobalConfig).toHaveBeenCalledWith({ domain: "opencode", agentKey: "main", model: "openai/gpt-5", variant: "high" }));
  });
});

describe("resolveDisplayLocale", () => {
  it.each([[undefined, "es-AR", "es"], [undefined, "fr-FR", "en"], ["en", "es-AR", "en"]] as const)("resolves %s with browser %s", (language, browser, expected) => {
    expect(resolveDisplayLocale(language, browser)).toBe(expected);
  });
});
