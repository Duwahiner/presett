import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OPTIONS, POST } from "../route";
import { switchProfile } from "@/adapters/opencode";

vi.mock("@/adapters/opencode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/adapters/opencode")>();
  return { ...actual, switchProfile: vi.fn() };
});

const mockSwitchProfile = vi.mocked(switchProfile);

function baseSwitchRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/profiles/base/switch", {
    method: "POST",
  });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

describe("POST /api/profiles/base/switch", () => {
  const configDir = "C:/tmp/base-config";
  const backupDir = "C:/tmp/base-backups";

  beforeEach(() => {
    process.env.PRESETT_TEST_CONFIG_DIR = configDir;
    process.env.PRESETT_TEST_BACKUP_DIR = backupDir;
  });

  afterEach(() => {
    delete process.env.PRESETT_TEST_CONFIG_DIR;
    delete process.env.PRESETT_TEST_BACKUP_DIR;
    mockSwitchProfile.mockReset();
  });

  it("delegates the Base switch to the adapter with an empty name and returns ok", async () => {
    mockSwitchProfile.mockResolvedValue({ ok: true } as never);

    const response = await POST(baseSwitchRequest("http://[::1]:3000"));

    expect(mockSwitchProfile).toHaveBeenCalledWith(configDir, "", backupDir);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects a missing Origin without switching", async () => {
    const response = await POST(baseSwitchRequest());

    expect(response.status).toBe(403);
    expect(mockSwitchProfile).not.toHaveBeenCalled();
  });

  it("rejects a non-loopback Origin without switching", async () => {
    const response = await POST(baseSwitchRequest("http://evil.test"));

    expect(response.status).toBe(403);
    expect(mockSwitchProfile).not.toHaveBeenCalled();
  });

  it("maps a generic adapter failure to 500", async () => {
    mockSwitchProfile.mockResolvedValue({
      ok: false,
      error: { code: "ATOMIC_WRITE_FAILED", message: "write failed" },
    });

    const response = await POST(baseSwitchRequest("http://127.0.0.1:3000"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("ATOMIC_WRITE_FAILED");
  });

  it("maps a SCHEMA_INVALID adapter failure to 400", async () => {
    mockSwitchProfile.mockResolvedValue({
      ok: false,
      error: { code: "SCHEMA_INVALID", message: "invalid schema" },
    });

    const response = await POST(baseSwitchRequest("http://127.0.0.1:3000"));

    expect(response.status).toBe(400);
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "OPTIONS, POST",
    );
  });
});