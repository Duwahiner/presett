import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ModelCache } from "@/lib/validators";

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

import { runGentleAiSync } from "@/services/processService";
import { updateProfilePhase } from "@/adapters/opencode";

const mockedRunSync = vi.mocked(runGentleAiSync);

const cache: ModelCache = {
  openai: { "gpt-4": ["low", "high"] },
  anthropic: { "claude-sonnet-4": ["standard", "high"] },
};

describe("updateProfilePhase", () => {
  beforeEach(() => {
    mockedRunSync.mockReset();
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "synced", stderr: "" },
    });
  });

  it("delegates a phase assignment to runGentleAiSync with --profile-phase args", async () => {
    const result = await updateProfilePhase(
      "cheap",
      "apply",
      { provider: "anthropic", model: "claude-sonnet-4", variant: "high" },
      cache,
    );

    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile-phase",
      "cheap:apply:anthropic/claude-sonnet-4",
    ]);
    expect(result.ok).toBe(true);
  });

  it("surfaces a failed sync without writing opencode.json", async () => {
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 1, stdout: "", stderr: "phase rejected" },
    });

    const result = await updateProfilePhase(
      "cheap",
      "init",
      { provider: "openai", model: "gpt-4", variant: "low" },
      cache,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.exitCode).toBe(1);
  });

  it("rejects an invalid profile name before delegating", async () => {
    const result = await updateProfilePhase(
      "../../evil",
      "apply",
      { provider: "openai", model: "gpt-4", variant: "low" },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects an unknown phase before delegating", async () => {
    const result = await updateProfilePhase(
      "cheap",
      "not-a-phase",
      { provider: "openai", model: "gpt-4", variant: "low" },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects a model not in the catalog before delegating", async () => {
    const result = await updateProfilePhase(
      "cheap",
      "apply",
      { provider: "openai", model: "gpt-99", variant: "low" },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });
});