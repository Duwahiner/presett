import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setLocale } from "@/resources/resources";
import { GlobalConfigClient, resolveDisplayLocale } from "../GlobalConfigClient";

const { getGlobalConfig, patchGlobalConfig } = vi.hoisted(() => ({ getGlobalConfig: vi.fn(), patchGlobalConfig: vi.fn() }));
vi.mock("@/services/globalConfigApiService", () => ({ getGlobalConfig, patchGlobalConfig }));

const configuredResponse = {
  defaultAgent: "main",
  assignments: [{ agentKey: "main", provider: "openai", model: "gpt-5", variant: "high" }],
  gentleAi: { language: "en", persona: "Builder" },
};

describe("GlobalConfigClient runtime behavior", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setLocale("en");
  });

  it("shows a loading status before rendering both configuration panels", async () => {
    let resolve!: (value: typeof configuredResponse) => void;
    getGlobalConfig.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<GlobalConfigClient />);

    expect(screen.getByRole("status").textContent).toContain("Loading configuration");
    resolve(configuredResponse);
    expect(await screen.findByRole("heading", { name: "Gentle-AI" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "OpenCode" })).toBeTruthy();
    expect(screen.getAllByText("Configured")).toHaveLength(2);
  });

  it("renders a full-width configuration header with aligned content", async () => {
    getGlobalConfig.mockResolvedValueOnce(configuredResponse);
    render(<GlobalConfigClient />);

    const heading = await screen.findByRole("heading", { name: "Global configuration" });
    const header = heading.closest("header");
    expect(header?.className).toContain("bg-card");
    expect(header?.className).toContain("border-b");
    expect(header?.parentElement?.className).not.toContain("max-w-3xl");
    expect(header?.firstElementChild?.className).toContain("max-w-3xl");
    expect(header?.contains(screen.getByText("Manage Gentle-AI and OpenCode preferences independently."))).toBe(true);
    expect(screen.getAllByText("Configured").some((badge) => header?.contains(badge))).toBe(true);
  });

  it("saves Gentle-AI without changing the OpenCode payload", async () => {
    getGlobalConfig.mockResolvedValueOnce(configuredResponse);
    patchGlobalConfig.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<GlobalConfigClient />);

    await user.clear(await screen.findByLabelText("Persona"));
    await user.type(screen.getByLabelText("Persona"), "Reviewer");
    await user.click(screen.getByRole("button", { name: "Save Gentle-AI" }));

    await waitFor(() => expect(patchGlobalConfig).toHaveBeenCalledWith({ domain: "gentle-ai", language: "en", persona: "Reviewer" }));
    expect(screen.getByRole("status").textContent).toContain("Gentle-AI configuration saved");
  });

  it("disables both actions while saving OpenCode and persists only that panel", async () => {
    let resolve!: () => void;
    getGlobalConfig.mockResolvedValueOnce(configuredResponse);
    patchGlobalConfig.mockReturnValueOnce(new Promise<void>((done) => { resolve = done; }));
    const user = userEvent.setup();
    render(<GlobalConfigClient />);

    await user.click(await screen.findByRole("button", { name: "Save OpenCode" }));
    expect(screen.getByRole("button", { name: "Save OpenCode" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Save Gentle-AI" }).hasAttribute("disabled")).toBe(true);
    resolve();
    await waitFor(() => expect(patchGlobalConfig).toHaveBeenCalledWith({ domain: "opencode", agentKey: "main", model: "openai/gpt-5", variant: "high" }));
    expect(screen.getByRole("status").textContent).toContain("OpenCode configuration saved");
  });

  it("announces save failures as alerts", async () => {
    getGlobalConfig.mockResolvedValueOnce(configuredResponse);
    patchGlobalConfig.mockRejectedValueOnce(new Error("failed"));
    const user = userEvent.setup();
    render(<GlobalConfigClient />);

    await user.click(await screen.findByRole("button", { name: "Save Gentle-AI" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Gentle-AI configuration could not be saved");
  });

  it("shows field errors and focuses the first invalid OpenCode field", async () => {
    getGlobalConfig.mockResolvedValueOnce({ assignments: [], gentleAi: {} });
    const user = userEvent.setup();
    render(<GlobalConfigClient />);

    await user.click(await screen.findByRole("button", { name: "Save OpenCode" }));
    expect(screen.getAllByText("This field is required.")).toHaveLength(3);
    expect(document.activeElement).toBe(screen.getByLabelText("Agent"));
    expect(screen.getByLabelText("Agent").getAttribute("aria-invalid")).toBe("true");
    expect(patchGlobalConfig).not.toHaveBeenCalled();
  });

  it("announces load failures as alerts", async () => {
    getGlobalConfig.mockRejectedValueOnce(new Error("failed"));
    render(<GlobalConfigClient />);

    expect((await screen.findByRole("alert")).textContent).toContain("Configuration could not be loaded");
  });
});

describe("resolveDisplayLocale", () => {
  it.each([[undefined, "es-AR", "es"], [undefined, "fr-FR", "en"], ["en", "es-AR", "en"]] as const)("resolves %s with browser %s", (language, browser, expected) => {
    expect(resolveDisplayLocale(language, browser)).toBe(expected);
  });
});
