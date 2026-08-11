import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET } from "../route";

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
