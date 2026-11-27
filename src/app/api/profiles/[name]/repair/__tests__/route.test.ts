import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OPTIONS, POST } from "../route";
import * as processService from "@/services/processService";
import { readOpenCodeConfigSafe, repairProfile } from "@/adapters/opencode";

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

vi.mock("@/adapters/opencode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/adapters/opencode")>();
  return {
    ...actual,
    readOpenCodeConfigSafe: vi.fn(actual.readOpenCodeConfigSafe),
    repairProfile: vi.fn(actual.repairProfile),
  };
});

const mockedRunSync = vi.mocked(processService.runGentleAiSync);
const mockedReadConfig = vi.mocked(readOpenCodeConfigSafe);
const mockedRepair = vi.mocked(repairProfile);

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
    mockedReadConfig.mockClear();
    mockedRepair.mockClear();
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

  it("answers 410 FEATURE_RETIRED for an incomplete profile without reading config, spawning gentle-ai or writing a backup", async () => {
    // An incomplete generated-multi profile used to trigger a repair.
    await writeConfig({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-cheap": { model: "anthropic/claude-sonnet-4", variant: "high" },
    });
    const configPath = join(tempDir, "opencode.json");
    const before = await readFile(configPath, "utf-8");

    const response = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap" }),
    });
    const body = JSON.parse(await response.text());

    expect(response.status).toBe(410);
    expect(body.error.code).toBe("FEATURE_RETIRED");
    expect(typeof body.error.message).toBe("string");
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedRepair).not.toHaveBeenCalled();
    expect(await readFile(configPath, "utf-8")).toBe(before);
    await expect(readdir(join(tempDir, "backups"))).rejects.toThrow();
  });

  it("answers 410 regardless of config presence, strategy or profile name", async () => {
    // No opencode.json at all.
    const missing = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "cheap" }),
    });
    expect(missing.status).toBe(410);

    await writeConfig({ "review-risk": { mode: "subagent", model: "x/y" } });
    const invalidName = await POST(repairRequest("http://127.0.0.1:3000"), {
      params: Promise.resolve({ name: "../../evil" }),
    });
    expect(invalidName.status).toBe(410);

    expect(mockedReadConfig).not.toHaveBeenCalled();
    expect(mockedRunSync).not.toHaveBeenCalled();
    await expect(readdir(join(tempDir, "backups"))).rejects.toThrow();
  });

  it("rejects missing Origin with 403 before the retired answer", async () => {
    const response = await POST(repairRequest(), {
      params: Promise.resolve({ name: "cheap" }),
    });

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
  });

  it("rejects non-loopback Origin with 403 before the retired answer", async () => {
    const response = await POST(repairRequest("http://evil.test"), {
      params: Promise.resolve({ name: "cheap" }),
    });

    expect(response.status).toBe(403);
    expect(mockedRunSync).not.toHaveBeenCalled();
    expect(mockedReadConfig).not.toHaveBeenCalled();
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
  });
});
