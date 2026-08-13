import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET } from "../route";
import { POST, OPTIONS } from "../[id]/route";

const backupActions = vi.hoisted(() => ({
  restoreBackup: vi.fn(),
  pinBackup: vi.fn(),
  unpinBackup: vi.fn(),
  deleteBackup: vi.fn(),
}));

vi.mock("@/services/backupsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/backupsService")>();
  return {
    ...actual,
    restoreBackup: backupActions.restoreBackup,
    pinBackup: backupActions.pinBackup,
    unpinBackup: backupActions.unpinBackup,
    deleteBackup: backupActions.deleteBackup,
  };
});

describe("GET /api/backups", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-api-"));
    process.env.PRESETT_TEST_BACKUPS_DIR = tempDir;
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_BACKUPS_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns a read-only backup list", async () => {
    const backupDir = join(tempDir, "20260810120000.000");
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      join(backupDir, "manifest.json"),
      JSON.stringify({
        id: "20260810120000.000",
        created_at: "2026-08-10T12:00:00Z",
        root_dir: "~/.config/opencode",
        entries: [{ original_path: "/a" }],
      }),
    );
    await writeFile(join(backupDir, "snapshot.tar.gz"), "x");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.backups).toHaveLength(1);
    expect(body.backups[0].fileCount).toBe(1);
  });
});

describe("POST /api/backups/[id]", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-action-api-"));
    process.env.PRESETT_TEST_BACKUPS_DIR = tempDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.PRESETT_TEST_BACKUPS_DIR;
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createBackup(id = "backup-1") {
    const backupDir = join(tempDir, id);
    await mkdir(backupDir, { recursive: true });
    await writeFile(join(backupDir, "manifest.json"), "{}");
    await writeFile(join(backupDir, "snapshot.tar.gz"), "x");
    return backupDir;
  }

  function postRequest(body: unknown, origin = "http://localhost:3000") {
    const request = new Request("http://localhost/api/backups/backup-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const headers = new Headers(request.headers);
    headers.set("Origin", origin);
    Object.defineProperty(request, "headers", { value: headers });
    return request;
  }

  function params(id = "backup-1") {
    return { params: Promise.resolve({ id }) };
  }

  it("rejects non-loopback origin before parsing JSON or invoking services", async () => {
    const request = new Request("http://localhost/api/backups/backup-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const headers = new Headers(request.headers);
    headers.set("Origin", "https://evil.test");
    Object.defineProperty(request, "headers", { value: headers });

    const response = await POST(request, params());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: { message: "Forbidden local API origin" } });
    expect(backupActions.restoreBackup).not.toHaveBeenCalled();
    expect(backupActions.pinBackup).not.toHaveBeenCalled();
    expect(backupActions.unpinBackup).not.toHaveBeenCalled();
    expect(backupActions.deleteBackup).not.toHaveBeenCalled();
  });

  it("responds to OPTIONS without invoking mutation services", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(backupActions.restoreBackup).not.toHaveBeenCalled();
    expect(backupActions.deleteBackup).not.toHaveBeenCalled();
  });

  it.each(["../backup", "backup/child", "backup tar;rm"])(
    "rejects malformed id before invoking services: %s",
    async (id) => {
      const response = await POST(postRequest({ action: "pin" }), params(id));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: { message: "Invalid backup id" } });
      expect(backupActions.pinBackup).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["restore", { action: "restore", confirmed: true }],
    ["pin", { action: "pin" }],
    ["unpin", { action: "unpin" }],
    ["delete", { action: "delete", confirmed: true }],
  ])(
    "returns 404 for a well-formed missing backup before %s mutation",
    async (_action, requestBody) => {
      const response = await POST(postRequest(requestBody), params("missing-1"));
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody).toEqual({ error: { message: "Backup not found" } });
      expect(backupActions.restoreBackup).not.toHaveBeenCalled();
      expect(backupActions.pinBackup).not.toHaveBeenCalled();
      expect(backupActions.unpinBackup).not.toHaveBeenCalled();
      expect(backupActions.deleteBackup).not.toHaveBeenCalled();
    },
  );

  it.each(["restore", "delete"])(
    "requires confirmed intent for %s before invoking services",
    async (action) => {
      await createBackup();

      const response = await POST(postRequest({ action }), params());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: { message: "Action requires confirmation" } });
      expect(backupActions.restoreBackup).not.toHaveBeenCalled();
      expect(backupActions.deleteBackup).not.toHaveBeenCalled();
    },
  );

  it("maps pinned delete rejection to a safe 409 response", async () => {
    await createBackup();
    backupActions.deleteBackup.mockResolvedValueOnce({
      ok: false,
      error: { code: "PINNED_CANNOT_DELETE", message: "Cannot delete pinned backup backup-1" },
    });

    const response = await POST(postRequest({ action: "delete", confirmed: true }), params());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: { message: "Cannot delete pinned backup" } });
    expect(backupActions.deleteBackup).toHaveBeenCalledWith(tempDir, "backup-1");
  });

  it("runs a confirmed action for an allowed origin and valid backup", async () => {
    await createBackup();
    backupActions.pinBackup.mockResolvedValueOnce({ ok: true, value: undefined });

    const response = await POST(postRequest({ action: "pin" }, "http://127.0.0.1:5173"), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(backupActions.pinBackup).toHaveBeenCalledWith(tempDir, "backup-1");
  });

  it("does not invoke tar-backed restore for invalid ids and hides tar failure details", async () => {
    const invalidResponse = await POST(
      postRequest({ action: "restore", confirmed: true }),
      params("../backup"),
    );

    expect(invalidResponse.status).toBe(400);
    expect(backupActions.restoreBackup).not.toHaveBeenCalled();

    await createBackup();
    backupActions.restoreBackup.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "RESTORE_FAILED",
        message: "Failed to restore backup backup-1 to C:/secret/path",
        cause: new Error("tar: C:/secret/path: permission denied"),
      },
    });

    const tarFailureResponse = await POST(
      postRequest({ action: "restore", confirmed: true }),
      params(),
    );
    const body = await tarFailureResponse.json();

    expect(tarFailureResponse.status).toBe(500);
    expect(body).toEqual({ error: { message: "Backup restore failed" } });
    expect(JSON.stringify(body)).not.toContain("C:/secret/path");
    expect(JSON.stringify(body)).not.toContain("permission denied");
  });
});
