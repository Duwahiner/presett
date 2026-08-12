import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listBackups,
  readBackupManifest,
  restoreBackup,
  pinBackup,
  unpinBackup,
  deleteBackup,
} from "@/services/backupsService";

describe("listBackups", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-"));
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

  it("marks backup as unpinned when .pinned file is absent", async () => {
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

    const backups = await listBackups(tempDir);

    expect(backups).toHaveLength(1);
    expect(backups[0].pinned).toBe(false);
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
});

describe("pinBackup / unpinBackup", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-pin-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates .pinned marker on pin", async () => {
    const backupDir = join(tempDir, "backup-1");
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      join(backupDir, "manifest.json"),
      JSON.stringify({
        id: "backup-1",
        created_at: "2026-08-10T12:00:00Z",
        root_dir: "/tmp/target",
        entries: [],
      }),
    );

    const result = await pinBackup(tempDir, "backup-1");
    expect(result.ok).toBe(true);

    const backups = await listBackups(tempDir);
    expect(backups[0].pinned).toBe(true);
  });

  it("removes .pinned marker on unpin", async () => {
    const backupDir = join(tempDir, "backup-2");
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      join(backupDir, "manifest.json"),
      JSON.stringify({
        id: "backup-2",
        created_at: "2026-08-10T12:00:00Z",
        root_dir: "/tmp/target",
        entries: [],
      }),
    );
    await writeFile(join(backupDir, ".pinned"), "");

    const result = await unpinBackup(tempDir, "backup-2");
    expect(result.ok).toBe(true);

    const backups = await listBackups(tempDir);
    expect(backups[0].pinned).toBe(false);
  });
});

describe("deleteBackup", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-del-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("deletes an unpinned backup", async () => {
    const backupDir = join(tempDir, "backup-del");
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      join(backupDir, "manifest.json"),
      JSON.stringify({
        id: "backup-del",
        created_at: "2026-08-10T12:00:00Z",
        root_dir: "/tmp/target",
        entries: [],
      }),
    );

    const result = await deleteBackup(tempDir, "backup-del");
    expect(result.ok).toBe(true);

    const backups = await listBackups(tempDir);
    expect(backups).toHaveLength(0);
  });

  it("refuses to delete a pinned backup", async () => {
    const backupDir = join(tempDir, "backup-pinned");
    await mkdir(backupDir, { recursive: true });
    await writeFile(join(backupDir, ".pinned"), "");

    const result = await deleteBackup(tempDir, "backup-pinned");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PINNED_CANNOT_DELETE");
    }
  });
});

describe("restoreBackup", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-restore-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns error for missing manifest", async () => {
    const result = await restoreBackup(tempDir, "nonexistent");
    expect(result.ok).toBe(false);
  });
});
