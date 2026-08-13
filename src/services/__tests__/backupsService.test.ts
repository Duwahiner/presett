import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deleteBackup,
  listBackups,
  pinBackup,
  readBackupManifest,
  restoreBackup,
  unpinBackup,
} from "@/services/backupsService";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  default: { execFile: execFileMock },
  execFile: execFileMock,
}));

async function createBackup(backupsDir: string, id: string, pinned = false) {
  const backupDir = join(backupsDir, id);
  await mkdir(backupDir, { recursive: true });
  await writeFile(
    join(backupDir, "manifest.json"),
    JSON.stringify({
      id,
      created_at: "2026-08-10T12:00:00Z",
      root_dir: backupsDir,
      entries: [{ original_path: "/a" }],
    }),
  );
  await writeFile(join(backupDir, "snapshot.tar.gz"), "gzdata");
  if (pinned) await writeFile(join(backupDir, ".pinned"), "");
  return backupDir;
}

describe("listBackups", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-"));
    execFileMock.mockReset();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns derived metadata for each backup", async () => {
    const backupDir = join(tempDir, "upgrade-20260810T120000Z");
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      join(backupDir, "manifest.json"),
      JSON.stringify({
        id: "upgrade-20260810T120000Z",
        created_at: "2026-08-10T12:00:00Z",
        root_dir: "~/.config/opencode",
        entries: [{ original_path: "/a" }, { original_path: "/b" }],
      }),
    );
    await writeFile(join(backupDir, "snapshot.tar.gz"), "gzdata");
    await writeFile(join(backupDir, ".pinned"), "");

    const backups = await listBackups(tempDir);

    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({
      id: "upgrade-20260810T120000Z",
      source: "~/.config/opencode",
      fileCount: 2,
      size: 6,
      pinned: true,
    });
  });

  it("returns empty array when backups directory is missing", async () => {
    const backups = await listBackups(join(tempDir, "missing"));
    expect(backups).toEqual([]);
  });

  it("skips unreadable manifests, defaults missing snapshots, and sorts newest first", async () => {
    const olderDir = join(tempDir, "manual-older");
    const newerDir = join(tempDir, "manual-newer");
    await mkdir(olderDir, { recursive: true });
    await mkdir(newerDir, { recursive: true });
    await writeFile(
      join(olderDir, "manifest.json"),
      JSON.stringify({
        id: "manual-older",
        created_at: "2026-08-10T12:00:00Z",
        root_dir: "/older",
        entries: [],
      }),
    );
    await writeFile(
      join(newerDir, "manifest.json"),
      JSON.stringify({
        id: "manual-newer",
        created_at: "2026-08-11T12:00:00Z",
        root_dir: "/newer",
        entries: [{ original_path: "/a" }],
      }),
    );
    await mkdir(join(tempDir, "invalid"));
    await writeFile(join(tempDir, "invalid", "manifest.json"), "not json");

    const backups = await listBackups(tempDir);

    expect(backups).toEqual([
      expect.objectContaining({ id: "manual-newer", size: 0, pinned: false }),
      expect.objectContaining({ id: "manual-older", size: 0, pinned: false }),
    ]);
  });
});

describe("readBackupManifest", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns error for missing manifest", async () => {
    const result = await readBackupManifest(tempDir, "missing");
    expect(result.ok).toBe(false);
  });

  it("returns parse failure for invalid JSON", async () => {
    const backupDir = join(tempDir, "invalid");
    await mkdir(backupDir);
    await writeFile(join(backupDir, "manifest.json"), "not json");

    const result = await readBackupManifest(tempDir, "invalid");

    expect(result).toMatchObject({ ok: false, error: { code: "PARSE_FAILED" } });
  });
});

describe("backup operations", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-operations-"));
    execFileMock.mockReset();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("restores an existing backup without modifying its source files", async () => {
    const backupDir = await createBackup(tempDir, "backup-restore");
    execFileMock.mockImplementation((_file, _args, callback) => callback(null));

    const result = await restoreBackup(tempDir, "backup-restore");

    expect(result.ok).toBe(true);
    expect(execFileMock).toHaveBeenCalledWith(
      "tar",
      ["-xzf", join(backupDir, "snapshot.tar.gz"), "-C", tempDir],
      expect.any(Function),
    );
    await expect(stat(join(backupDir, "snapshot.tar.gz"))).resolves.toBeDefined();
  });

  it("pins and unpins only existing backups", async () => {
    const backupDir = await createBackup(tempDir, "backup-pin");

    expect((await pinBackup(tempDir, "backup-pin")).ok).toBe(true);
    await expect(stat(join(backupDir, ".pinned"))).resolves.toBeDefined();
    expect((await unpinBackup(tempDir, "backup-pin")).ok).toBe(true);
    await expect(stat(join(backupDir, ".pinned"))).rejects.toThrow();

    const missing = await pinBackup(tempDir, "missing-backup");
    expect(missing).toMatchObject({ ok: false, error: { code: "FILE_MISSING" } });
  });

  it("rejects invalid input before any backup mutation", async () => {
    const results = await Promise.all([
      restoreBackup(tempDir, "../evil"),
      pinBackup(tempDir, "../evil"),
      unpinBackup(tempDir, "../evil"),
      deleteBackup(tempDir, "../evil"),
    ]);

    expect(results.every((result) => !result.ok && result.error.code === "SCHEMA_INVALID")).toBe(
      true,
    );
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("does not delete pinned backups", async () => {
    const backupDir = await createBackup(tempDir, "backup-pinned", true);

    const result = await deleteBackup(tempDir, "backup-pinned");

    expect(result).toMatchObject({
      ok: false,
      error: { code: "PINNED_CANNOT_DELETE" },
    });
    await expect(stat(backupDir)).resolves.toBeDefined();
  });

  it("deletes an existing unpinned backup", async () => {
    const backupDir = await createBackup(tempDir, "backup-delete");

    expect((await deleteBackup(tempDir, "backup-delete")).ok).toBe(true);
    await expect(stat(backupDir)).rejects.toThrow();
  });
});
