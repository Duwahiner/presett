import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import {
  buildSafeError,
  isValidBackupId,
  requireMutationOrigin,
  resolveBackupPath,
} from "@/lib/localApiSecurity";

describe("requireMutationOrigin", () => {
  function requestWithOrigin(origin?: string) {
    const headers = new Headers();
    if (origin) headers.set("Origin", origin);
    const request = new Request("http://localhost/api", { method: "POST" });
    Object.defineProperty(request, "headers", { value: headers });
    return request;
  }

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://[::1]:4000",
  ])("accepts allowlisted loopback origin %s", (origin) => {
    const result = requireMutationOrigin(requestWithOrigin(origin));

    expect(result.ok).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["not parseable", "not a url"],
    ["remote host", "https://evil.test"],
    ["private network host", "http://192.168.1.10:3000"],
  ])("rejects %s origin", (_label, origin) => {
    const result = requireMutationOrigin(requestWithOrigin(origin));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.message).toBe("Forbidden local API origin");
    }
  });
});

describe("backup identifier guards", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  });

  it.each(["20260810120000.000", "upgrade-20260810T120000Z", "backup-1"])(
    "accepts a single safe backup id segment: %s",
    (id) => {
      expect(isValidBackupId(id)).toBe(true);
    },
  );

  it.each(["", ".", "..", "../backup", "backup/child", "backup\\child", "backup tar;rm", "%2e%2e"])(
    "rejects malformed or traversal id: %s",
    (id) => {
      expect(isValidBackupId(id)).toBe(false);
    },
  );

  it("resolves an existing backup under the backup root", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-security-"));
    await mkdir(join(tempDir, "backup-1"));

    const result = await resolveBackupPath(tempDir, "backup-1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.path).toBe(resolve(tempDir, "backup-1"));
  });

  it("rejects paths that do not resolve beneath the backup root", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-security-"));

    const result = await resolveBackupPath(tempDir, "../outside");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

describe("buildSafeError", () => {
  it("returns structured safe route error bodies", () => {
    expect(buildSafeError("Invalid backup id")).toEqual({
      error: { message: "Invalid backup id" },
    });
  });
});
