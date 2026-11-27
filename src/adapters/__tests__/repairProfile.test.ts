import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repairProfile } from "@/adapters/opencode";
import * as processService from "@/services/processService";

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

const mockedRunSync = vi.mocked(processService.runGentleAiSync);

describe("repairProfile (adapter)", () => {
  let tempDir = "";

  beforeEach(async () => {
    mockedRunSync.mockReset();
    tempDir = await mkdtemp(join(tmpdir(), "presett-repair-adapter-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function writeConfig(agent: Record<string, unknown>) {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent }));
  }

  it("delegates to gentle-ai sync --profile with the orchestrator's current model", async () => {
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4", variant: "high" },
    });
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "synced", stderr: "" },
    });

    const result = await repairProfile(
      "cheap",
      tempDir,
      join(tempDir, "backups"),
    );

    expect(result.ok).toBe(true);
    expect(mockedRunSync).toHaveBeenCalledWith(
      "gentle-ai",
      ["--profile", "cheap:anthropic/claude-sonnet-4"],
      30_000,
    );
  });

  it("creates an atomic backup before delegating so rollback is possible", async () => {
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4" },
    });
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "synced", stderr: "" },
    });

    const result = await repairProfile(
      "cheap",
      tempDir,
      join(tempDir, "backups"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const backupDir = join(tempDir, "backups");
    const files = await readdir(backupDir);
    expect(files).toHaveLength(1);
    const backupContent = JSON.parse(
      await readFile(join(backupDir, files[0]), "utf-8"),
    );
    // The backup is a snapshot of the pre-repair config.
    expect(backupContent.agent["sdd-orchestrator-cheap"].model).toBe(
      "anthropic/claude-sonnet-4",
    );
  });

  it("surfaces a nonzero sync exit code as a successful result carrying the CLI outcome", async () => {
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4" },
    });
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 1, stdout: "", stderr: "repair rejected" },
    });

    const result = await repairProfile("cheap", tempDir, join(tempDir, "backups"));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sync.exitCode).toBe(1);
  });

  it("returns SCHEMA_INVALID for a name with path traversal before any I/O", async () => {
    const result = await repairProfile(
      "../../evil",
      tempDir,
      join(tempDir, "backups"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the orchestrator agent is missing", async () => {
    await writeConfig({ "gentle-orchestrator": { model: "openai/gpt-4" } });

    const result = await repairProfile("ghost", tempDir, join(tempDir, "backups"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });
});