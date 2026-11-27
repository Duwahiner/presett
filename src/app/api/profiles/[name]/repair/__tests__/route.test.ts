import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OPTIONS, POST } from "../route";
import * as processService from "@/services/processService";

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

const mockedRunSync = vi.mocked(processService.runGentleAiSync);

function repairRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles/cheap/repair", {
    method: "POST",
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

describe("POST /api/profiles/[name]/repair", () => {
  let tempDir = "";

  beforeEach(async () => {
    mockedRunSync.mockReset();
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "repaired", stderr: "" },
    });
    tempDir = await mkdtemp(join(tmpdir(), "presett-repair-route-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  async function writeConfig(agent: Record<string, unknown>) {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent }));
  }

  it("returns 403 STRATEGY_READONLY on external-single-active without delegating or writing a backup", async () => {
    await writeConfig({ "external-work": { mode: "primary", model: "openai/gpt-4" } });

    const response = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("STRATEGY_READONLY");
    expect(mockedRunSync).not.toHaveBeenCalled();
    await expect(readdir(join(tempDir, "backups"))).rejects.toThrow();
  });

  it("returns 403 STRATEGY_READONLY on unknown strategy without delegating", async () => {
    await writeConfig({ "review-risk": { mode: "subagent", model: "x/y" } });

    const response = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("STRATEGY_READONLY");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("repairs an incomplete generated-multi profile by delegating to sync after an atomic backup", async () => {
    // Cheap is generated-multi and incomplete: it lacks its ten phase agents.
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4", variant: "high" },
    });

    const response = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap" }),
    });

    expect(response.status).toBe(200);
    const body = JSON.parse(await response.text());
    expect(body.ok).toBe(true);
    expect(mockedRunSync).toHaveBeenCalledWith(
      "gentle-ai",
      ["--profile", "cheap:anthropic/claude-sonnet-4"],
      30_000,
    );

    // A pre-repair backup exists so rollback is possible.
    const backups = await readdir(join(tempDir, "backups"));
    expect(backups).toHaveLength(1);
  });

  it("keeps opencode.json unchanged when repair succeeds (sync owns the phase agents)", async () => {
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4", variant: "high" },
    });

    const response = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap" }),
    });

    expect(response.status).toBe(200);
    // PreSett must not rewrite the generated profile; gentle-ai owns it.
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.agent["sdd-orchestrator-cheap"].model).toBe("anthropic/claude-sonnet-4");
    expect(written.agent["sdd-apply-cheap"]).toBeUndefined();
  });

  it("reports a CLI failure as HTTP 500 and leaves the backup recoverable for rollback", async () => {
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4" },
    });
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 1, stdout: "", stderr: "repair failed" },
    });

    const response = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap" }),
    });

    expect(response.status).toBe(500);
    const backups = await readdir(join(tempDir, "backups"));
    expect(backups).toHaveLength(1);
    const backupContent = JSON.parse(
      await readFile(join(tempDir, "backups", backups[0]), "utf-8"),
    );
    expect(backupContent.agent["sdd-orchestrator-cheap"].model).toBe(
      "anthropic/claude-sonnet-4",
    );
  });

  it("returns 400 for an invalid profile name before delegating", async () => {
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4" },
    });

    const response = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "../../evil" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects missing Origin before delegating", async () => {
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4" },
    });

    const response = await POST(repairRequest(), {
      params: Promise.resolve({ name: "cheap" }),
    });

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
  });
});