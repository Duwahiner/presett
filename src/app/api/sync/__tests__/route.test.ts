import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  runGentleAiSync,
  writeSyncTimestamp,
  clearServerModelCatalogCache,
  revalidatePath,
} = vi.hoisted(() => ({
  runGentleAiSync: vi.fn(),
  writeSyncTimestamp: vi.fn(),
  clearServerModelCatalogCache: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/services/processService", () => ({ runGentleAiSync }));
vi.mock("@/services/syncStateService", () => ({ writeSyncTimestamp }));
vi.mock("@/services/modelCatalogService", () => ({
  clearServerModelCatalogCache,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

import { OPTIONS, POST } from "../route";

function mutationRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/sync", { method: "POST" });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing Origin before running sync", async () => {
    const response = await POST(mutationRequest());

    expect(response.status).toBe(403);
    expect(runGentleAiSync).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: { message: "Forbidden local API origin" },
    });
  });

  it("rejects non-loopback Origin before running sync", async () => {
    const response = await POST(mutationRequest("http://evil.test"));

    expect(response.status).toBe(403);
    expect(runGentleAiSync).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: { message: "Forbidden local API origin" },
    });
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("OPTIONS, POST");
  });

  it("returns error when gentle-ai is missing", async () => {
    runGentleAiSync.mockResolvedValue({
      ok: false,
      error: { code: "FILE_MISSING", message: "unavailable" },
    });
    const response = await POST(mutationRequest("http://localhost:5173"));

    expect(response.status).toBe(503);
    expect(writeSyncTimestamp).not.toHaveBeenCalled();
  });

  it("returns an error when gentle-ai exits unsuccessfully", async () => {
    runGentleAiSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 1, stdout: "", stderr: "boom" },
    });
    const response = await POST(mutationRequest("http://localhost:5173"));

    expect(response.status).toBe(500);
    expect(writeSyncTimestamp).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: { message: "Gentle-AI sync failed" },
    });
  });

  it("returns success and persists the timestamp when sync succeeds", async () => {
    runGentleAiSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "ok", stderr: "" },
    });
    writeSyncTimestamp.mockResolvedValue({ ok: true, value: undefined });
    const response = await POST(mutationRequest("http://localhost:5173"));

    expect(response.status).toBe(200);
    expect(writeSyncTimestamp).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(clearServerModelCatalogCache).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    });
  });

  it("keeps HTTP success with a warning when persistence fails", async () => {
    runGentleAiSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "ok", stderr: "" },
    });
    writeSyncTimestamp.mockResolvedValue({
      ok: false,
      error: { code: "ATOMIC_WRITE_FAILED", message: "disk full" },
    });
    const response = await POST(mutationRequest("http://localhost:5173"));

    expect(response.status).toBe(200);
    expect(writeSyncTimestamp).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/");
    const body = await response.json();
    expect(body.exitCode).toBe(0);
    expect(typeof body.warning).toBe("string");
    expect(body.warning.length).toBeGreaterThan(0);
  });
});