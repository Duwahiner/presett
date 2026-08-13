import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OPTIONS, POST } from "../route";

function switchProfileRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles/custom/switch", {
    method: "POST",
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

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

    const response = await POST(switchProfileRequest("http://[::1]:3000"), {
      params: Promise.resolve({ name: "custom" }),
    });
    expect(response.status).toBe(200);

    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));
    expect(written.default_agent).toBe("sdd-orchestrator-custom");
  });

  it("rejects missing Origin before switching profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: { "sdd-orchestrator-custom": { model: "x/y" } },
      }),
    );

    const response = await POST(switchProfileRequest(), {
      params: Promise.resolve({ name: "custom" }),
    });
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.default_agent).toBe("gentle-orchestrator");
  });

  it("rejects non-loopback Origin before switching profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: { "sdd-orchestrator-custom": { model: "x/y" } },
      }),
    );

    const response = await POST(switchProfileRequest("http://evil.test"), {
      params: Promise.resolve({ name: "custom" }),
    });
    const written = JSON.parse(await readFile(join(tempDir, "opencode.json"), "utf-8"));

    expect(response.status).toBe(403);
    expect(written.default_agent).toBe("gentle-orchestrator");
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("OPTIONS, POST");
  });
});
