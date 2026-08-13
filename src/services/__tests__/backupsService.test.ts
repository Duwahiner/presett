import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listBackups, readBackupManifest } from "@/services/backupsService";

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
