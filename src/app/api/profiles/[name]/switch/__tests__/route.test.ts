import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { POST } from "../route";

describe("POST /api/profiles/[name]/switch", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-switch-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("switches default_agent to the profile orchestrator", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: { "sdd-orchestrator-custom": { model: "x/y" } },
      }),
    );

    const response = await POST(undefined, {
      params: Promise.resolve({ name: "custom" }),
    });
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.default_agent).toBe("sdd-orchestrator-custom");
  });
});
