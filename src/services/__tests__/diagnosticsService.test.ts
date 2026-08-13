import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkGentleAiReleases,
  collectDiagnostics,
  shouldRunDiagnosticsCheck,
} from "@/services/diagnosticsService";

describe("collectDiagnostics", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-diagnostics-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns CLI version, config, state and route states without paths", async () => {
    const configDir = join(tempDir, "config");
    const gentleAiDir = join(tempDir, "gentle");
    await mkdir(configDir, { recursive: true });
    await mkdir(gentleAiDir, { recursive: true });
    await writeFile(join(configDir, "opencode.json"), JSON.stringify({ agent: {} }));
    await writeFile(join(gentleAiDir, "state.json"), JSON.stringify({ installed_agents: [] }));

    const result = await collectDiagnostics({
      configDir,
      gentleAiDir,
      versionProbe: async () => ({ ok: true, value: "1.2.3" }),
    });

    expect(result.cli).toEqual({ installed: true, version: "1.2.3" });
    expect(result.config).toEqual({ available: true });
    expect(result.state).toEqual({ available: true });
    expect(result.routes.config).toEqual({ exists: true, readable: true, writable: true });
    expect(JSON.stringify(result)).not.toContain(tempDir);
  });

  it("classifies unavailable resources while preserving partial diagnostics", async () => {
    const configDir = join(tempDir, "missing-config");
    const gentleAiDir = join(tempDir, "missing-gentle");

    const result = await collectDiagnostics({
      configDir,
      gentleAiDir,
      versionProbe: async () => ({ ok: false, error: { code: "FILE_MISSING", message: "missing /secret/bin" } }),
    });

    expect(result.cli).toEqual({ installed: false, error: "CLI unavailable" });
    expect(result.config).toEqual({ available: false, error: "Configuration unavailable" });
    expect(result.state).toEqual({ available: false, error: "State unavailable" });
    expect(result.routes.state).toEqual({ exists: false, readable: false, writable: false });
    expect(JSON.stringify(result)).not.toContain("/secret/bin");
  });
});

describe("Gentle-AI release checks", () => {
  it("compares stable and RC releases independently", async () => {
    const state = await checkGentleAiReleases({
      installedVersion: "1.2.0",
      now: new Date("2026-08-13T10:00:00Z"),
      fetchReleases: async () => [
        { tag_name: "v1.3.0", prerelease: false, draft: false },
        { tag_name: "v1.4.0-rc.1", prerelease: true, draft: false },
      ],
      readState: async () => ({ settings: { frequencyMinutes: 60 } }),
      writeState: async () => undefined,
    });

    expect(state.channels?.stable).toEqual({ latestVersion: "1.3.0", updateAvailable: true });
    expect(state.channels?.rc).toEqual({ latestVersion: "1.4.0-rc.1", updateAvailable: true });
    expect(state.notice).toEqual({ channel: "stable", version: "1.3.0", pending: true });
  });

  it("does not promote a newer RC to the stable channel", async () => {
    const state = await checkGentleAiReleases({
      installedVersion: "1.3.0",
      fetchReleases: async () => [
        { tag_name: "v1.3.0", prerelease: false, draft: false },
        { tag_name: "v1.4.0-rc.1", prerelease: true, draft: false },
      ],
      readState: async () => ({ settings: { frequencyMinutes: 60 } }),
      writeState: async () => undefined,
    });

    expect(state.channels?.stable).toEqual({ latestVersion: "1.3.0", updateAvailable: false });
    expect(state.channels?.rc).toEqual({ latestVersion: "1.4.0-rc.1", updateAvailable: true });
    expect(state.notice).toEqual({ channel: "rc", version: "1.4.0-rc.1", pending: true });
  });

  it("persists query status and clears pending notice when installed version catches up", async () => {
    const writeState = vi.fn(async () => undefined);

    const state = await checkGentleAiReleases({
      installedVersion: "1.3.0",
      now: new Date("2026-08-13T10:00:00Z"),
      fetchReleases: async () => [{ tag_name: "v1.3.0", prerelease: false, draft: false }],
      readState: async () => ({
        settings: { frequencyMinutes: 60 },
        notice: { channel: "stable", version: "1.3.0", pending: true },
      }),
      writeState,
    });

    expect(state.status).toEqual({ phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" });
    expect(state.notice).toBeNull();
    expect(writeState).toHaveBeenCalledWith(state);
  });

  it("classifies timeout, rate limit and malformed release failures without leaking details", async () => {
    await expect(checkGentleAiReleases({
      installedVersion: "1.0.0",
      fetchReleases: async () => { throw new DOMException("request timed out /Users/me", "TimeoutError"); },
    })).resolves.toMatchObject({ status: { phase: "error", code: "timeout", message: "Release check timed out" } });

    await expect(checkGentleAiReleases({
      installedVersion: "1.0.0",
      fetchReleases: async () => ({ status: 403 }),
    })).resolves.toMatchObject({ status: { phase: "error", code: "rate_limited", message: "GitHub release check is rate limited" } });

    await expect(checkGentleAiReleases({
      installedVersion: "1.0.0",
      fetchReleases: async () => [{ tag_name: "latest", prerelease: false, draft: false }],
    })).resolves.toMatchObject({ status: { phase: "error", code: "malformed", message: "Release response was not usable" } });
  });

  it("uses the configurable frequency to decide automatic checks", () => {
    expect(shouldRunDiagnosticsCheck({ frequencyMinutes: 60 }, undefined, new Date("2026-08-13T10:00:00Z"))).toBe(true);
    expect(shouldRunDiagnosticsCheck(
      { frequencyMinutes: 60 },
      "2026-08-13T09:30:00.000Z",
      new Date("2026-08-13T10:00:00Z"),
    )).toBe(false);
    expect(shouldRunDiagnosticsCheck(
      { frequencyMinutes: 60 },
      "2026-08-13T08:30:00.000Z",
      new Date("2026-08-13T10:00:00Z"),
    )).toBe(true);
  });
});
