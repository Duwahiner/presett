import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  default: { execFile: execFileMock },
  execFile: execFileMock,
}));
import {
  listBackups,
  readBackupManifest,
  restoreBackup,
  pinBackup,
  unpinBackup,
  deleteBackup,
  getBackupDetail,
} from "@/services/backupsService";

const backupManifest = (overrides: Record<string, unknown> = {}) => ({
  id: "backup-test",
  created_at: "2026-08-10T12:00:00Z",
  root_dir: "/tmp/target",
  entries: [],
  ...overrides,
});

async function createBackupFixture(
  backupsDir: string,
  id: string,
  options: {
    createdAt?: string;
    entries?: Array<{ original_path: string }>;
    rootDir?: string;
    snapshot?: string;
    pinned?: boolean;
  } = {},
) {
  const backupDir = join(backupsDir, id);
  await mkdir(backupDir, { recursive: true });
  await writeFile(
    join(backupDir, "manifest.json"),
    JSON.stringify(
      backupManifest({
        id,
        created_at: options.createdAt ?? "2026-08-10T12:00:00Z",
        root_dir: options.rootDir ?? "/tmp/target",
        entries: options.entries ?? [],
      }),
    ),
  );

  if (options.snapshot !== undefined) {
    await writeFile(join(backupDir, "snapshot.tar.gz"), options.snapshot);
  }

  if (options.pinned) {
    await writeFile(join(backupDir, ".pinned"), "");
  }

  return backupDir;
}

describe("listBackups", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-"));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.doUnmock("node:fs/promises");
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
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.doUnmock("node:fs/promises");
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns error for missing manifest", async () => {
    const result = await readBackupManifest(tempDir, "missing");
    expect(result.ok).toBe(false);
  });
});

describe("getBackupDetail", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backup-detail-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns manifest metadata and only safe display paths", async () => {
    await createBackupFixture(tempDir, "backup-detail", {
      rootDir: "/home/user/project",
      snapshot: "snapshot",
      entries: [
        { original_path: "/home/user/project/config/settings.json" },
        { original_path: "agents/reviewer.md" },
        { original_path: "/home/user/private/token.json" },
        { original_path: "../outside.txt" },
      ],
    });

    const result = await getBackupDetail(tempDir, "backup-detail");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        id: "backup-detail",
        source: "/home/user/project",
        fileCount: 4,
        size: 8,
        changePreview: { available: false },
      });
      expect(result.value.files).toEqual([
        { path: "config/settings.json" },
        { path: "agents/reviewer.md" },
        { path: null },
        { path: null },
      ]);
      expect(JSON.stringify(result.value.files)).not.toContain("private/token");
    }
  });

  it("rejects traversal before reading a manifest", async () => {
    const result = await getBackupDetail(tempDir, "../outside");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
  });
});

describe("pinBackup / unpinBackup", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-pin-"));
    vi.clearAllMocks();
    execFileMock.mockReset();
  });

  afterEach(async () => {
    vi.doUnmock("node:fs/promises");
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
    vi.clearAllMocks();
    execFileMock.mockReset();
  });

  afterEach(async () => {
    vi.doUnmock("node:fs/promises");
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

  it("rejects deleting a missing backup", async () => {
    const result = await deleteBackup(tempDir, "missing-backup");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FILE_MISSING");
    }
  });

  it("rejects invalid delete input before filesystem mutation", async () => {
    const result = await deleteBackup(tempDir, "../evil");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SCHEMA_INVALID");
      expect(result.error.message).toBe("Invalid backup id");
    }
    await expect(stat(join(tempDir, "..", "evil"))).rejects.toThrow();
  });

  it("rejects a non-directory backup path without mutating it", async () => {
    const fileBackedId = "backup-file-path";
    const filePath = join(tempDir, fileBackedId);
    await writeFile(filePath, "not a directory");

    const result = await restoreBackup(tempDir, fileBackedId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FILE_MISSING");
      expect(result.error.message).toBe(`Backup not found: ${fileBackedId}`);
    }
    await expect(stat(filePath)).resolves.toMatchObject({
      size: "not a directory".length,
    });
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("maps delete removal failures and keeps the backup listed", async () => {
    await createBackupFixture(tempDir, "backup-delete-fails");
    const rmFailure = new Error("deterministic Windows rm failure");

    const result = await deleteBackup(tempDir, "backup-delete-fails", {
      rm: async () => {
        throw rmFailure;
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FILE_MISSING");
      expect(result.error.message).toBe("Failed to delete backup backup-delete-fails");
      expect(result.error.cause).toBe(rmFailure);
    }
    expect((await listBackups(tempDir)).map((backup) => backup.id)).toEqual([
      "backup-delete-fails",
    ]);
  });
});

describe("restoreBackup", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-backups-restore-"));
    vi.clearAllMocks();
    execFileMock.mockReset();
  });

  afterEach(async () => {
    vi.doUnmock("node:fs/promises");
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns error for missing manifest", async () => {
    const result = await restoreBackup(tempDir, "nonexistent");
    expect(result.ok).toBe(false);
  });

  it("restores an existing backup without altering the source backup", async () => {
    execFileMock.mockImplementation((_file, _args, callback) => callback(null));
    const backupDir = join(tempDir, "backup-restore");
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      join(backupDir, "manifest.json"),
      JSON.stringify({
        id: "backup-restore",
        created_at: "2026-08-10T12:00:00Z",
        root_dir: tempDir,
        entries: [{ original_path: "settings.json" }],
      }),
    );
    await writeFile(join(backupDir, "snapshot.tar.gz"), "source archive");

    const result = await restoreBackup(tempDir, "backup-restore");

    expect(result.ok).toBe(true);
    expect(execFileMock).toHaveBeenCalledWith(
      "tar",
      ["-xzf", join(backupDir, "snapshot.tar.gz"), "-C", tempDir],
      expect.any(Function),
    );
    await expect(stat(join(backupDir, "manifest.json"))).resolves.toMatchObject({
      size: expect.any(Number),
    });
    await expect(stat(join(backupDir, "snapshot.tar.gz"))).resolves.toMatchObject({
      size: expect.any(Number),
    });
  });

  it("rejects invalid restore input before invoking tar", async () => {
    const result = await restoreBackup(tempDir, "../evil");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SCHEMA_INVALID");
    }
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("fails restore for a missing snapshot without changing the target", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "presett-restore-target-"));
    await writeFile(join(targetDir, "settings.json"), "original settings");
    await createBackupFixture(tempDir, "backup-missing-snapshot", {
      rootDir: targetDir,
    });

    const result = await restoreBackup(tempDir, "backup-missing-snapshot");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FILE_MISSING");
      expect(result.error.message).toContain("Snapshot file not found:");
    }
    await expect(stat(join(targetDir, "settings.json"))).resolves.toMatchObject({
      size: "original settings".length,
    });
    expect(execFileMock).not.toHaveBeenCalled();
    await rm(targetDir, { recursive: true, force: true });
  });

  it("maps tar extraction failures with the original cause and no partial restore", async () => {
    const targetDir = await mkdtemp(join(tmpdir(), "presett-restore-target-"));
    await writeFile(join(targetDir, "settings.json"), "original settings");
    const tarFailure = new Error("tar extraction failed deterministically");
    execFileMock.mockImplementation((_file, _args, callback) => {
      callback(tarFailure);
    });
    const backupDir = await createBackupFixture(tempDir, "backup-tar-fails", {
      rootDir: targetDir,
      snapshot: "archive bytes",
    });

    const result = await restoreBackup(tempDir, "backup-tar-fails");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("RESTORE_FAILED");
      expect(result.error.message).toBe(
        `Failed to restore backup backup-tar-fails to ${targetDir}`,
      );
      expect(result.error.cause).toBe(tarFailure);
    }
    expect(execFileMock).toHaveBeenCalledWith(
      "tar",
      ["-xzf", join(backupDir, "snapshot.tar.gz"), "-C", targetDir],
      expect.any(Function),
    );
    await expect(stat(join(targetDir, "settings.json"))).resolves.toMatchObject({
      size: "original settings".length,
    });
    await rm(targetDir, { recursive: true, force: true });
  });
});
