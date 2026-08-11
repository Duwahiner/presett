import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readdir, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPreWriteBackup,
  prunePreWriteBackups,
} from "@/lib/preWriteBackup";

describe("createPreWriteBackup", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backup-"));
  });

  afterEach(async () => {
    await import("node:fs/promises").then(({ rm }) =>
      rm(tempDir, { recursive: true, force: true }),
    );
  });

  it("copies the source file into the backup directory", async () => {
    const sourceFile = join(tempDir, "opencode.json");
    await writeFile(sourceFile, '{"agent":{}}');

    const backupDir = join(tempDir, "backups");
    const result = await createPreWriteBackup(sourceFile, backupDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const files = await readdir(backupDir);
    expect(files.length).toBe(1);

    const backupPath = join(backupDir, files[0]);
    const content = await readFile(backupPath, "utf-8");
    expect(content).toBe('{"agent":{}}');
  });

  it("returns error when the source file does not exist", async () => {
    const result = await createPreWriteBackup(
      join(tempDir, "missing.json"),
      join(tempDir, "backups"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FILE_MISSING");
  });
});

describe("prunePreWriteBackups", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backup-"));
  });

  afterEach(async () => {
    await import("node:fs/promises").then(({ rm }) =>
      rm(tempDir, { recursive: true, force: true }),
    );
  });

  it("keeps only the newest N backups", async () => {
    const backupDir = join(tempDir, "backups");
    await mkdir(backupDir, { recursive: true });
    for (let i = 0; i < 5; i++) {
      const file = join(backupDir, `20260810-10000${i}__opencode.json`);
      await writeFile(file, "{}");
    }

    await prunePreWriteBackups(backupDir, 3);

    const files = await readdir(backupDir);
    expect(files.length).toBe(3);
    expect(files).not.toContain("20260810-100000__opencode.json");
    expect(files).not.toContain("20260810-100001__opencode.json");
  });
});
