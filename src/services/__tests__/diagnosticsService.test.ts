import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectDiagnostics } from "@/services/diagnosticsService";

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
