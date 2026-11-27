import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { POST } from "../route";

function baseSwitchRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles/base/switch", {
    method: "POST",
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

describe("POST /api/profiles/base/switch (real adapter integration)", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-base-switch-"));
    process.env.PRESETT_TEST_CONFIG_DIR = tempDir;
    process.env.PRESETT_TEST_BACKUP_DIR = join(tempDir, "backups");
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("writes default_agent to gentle-orchestrator for the Base profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "sdd-orchestrator-prod",
        agent: { "sdd-orchestrator-prod": { model: "x/y" } },
      }),
    );

    const response = await POST(baseSwitchRequest("http://[::1]:3000"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.default_agent).toBe("gentle-orchestrator");
  });

  it("does not write when the origin is not allowed", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "sdd-orchestrator-prod",
        agent: { "sdd-orchestrator-prod": { model: "x/y" } },
      }),
    );

    const response = await POST(baseSwitchRequest());
    expect(response.status).toBe(403);

    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.default_agent).toBe("sdd-orchestrator-prod");
  });
});