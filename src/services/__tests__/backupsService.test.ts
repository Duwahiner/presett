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
