import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readSyncState,
  writeSyncTimestamp,
} from "@/services/syncStateService";
import { syncStatePath } from "@/lib/paths";

describe("syncStatePath", () => {
  it("points to sync-state.json under the presett directory", () => {
    const path = syncStatePath({ presettDir: "/tmp/custom-presett" });
    expect(path).toBe(join("/tmp/custom-presett", "sync-state.json"));
  });

  it("uses the home presett directory by default", () => {
    expect(syncStatePath()).toMatch(/presett[\\/]sync-state\.json$/);
  });
});

describe("readSyncState", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-sync-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns undefined when sync-state.json does not exist", async () => {
    expect(await readSyncState({ presettDir: tempDir })).toBeUndefined();
  });

  it("returns undefined when the file is not valid JSON", async () => {
    await writeFile(join(tempDir, "sync-state.json"), "{ not json", "utf-8");
    expect(await readSyncState({ presettDir: tempDir })).toBeUndefined();
  });

  it("returns undefined when the timestamp is invalid", async () => {
    await writeFile(
      join(tempDir, "sync-state.json"),
      JSON.stringify({ lastSuccessfulSyncAt: "not-a-date" }),
      "utf-8",
    );
    expect(await readSyncState({ presettDir: tempDir })).toBeUndefined();
  });

  it("returns the ISO timestamp when the state is valid", async () => {
    const frozen = "2026-08-10T21:00:00.000Z";
    await writeFile(
      join(tempDir, "sync-state.json"),
      JSON.stringify({ lastSuccessfulSyncAt: frozen }),
      "utf-8",
    );
    expect(await readSyncState({ presettDir: tempDir })).toBe(frozen);
  });
});

describe("writeSyncTimestamp", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-sync-write-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("writes a valid ISO timestamp atomically and returns ok", async () => {
    const result = await writeSyncTimestamp({ presettDir: tempDir });

    expect(result.ok).toBe(true);
    const raw = await readFile(join(tempDir, "sync-state.json"), "utf-8");
    const parsed = JSON.parse(raw) as { lastSuccessfulSyncAt: string };
    expect(parsed.lastSuccessfulSyncAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("creates the presett directory when it does not exist", async () => {
    const nested = join(tempDir, "deep", "missing");
    const result = await writeSyncTimestamp({ presettDir: nested });

    expect(result.ok).toBe(true);
    await expect(readFile(join(nested, "sync-state.json"), "utf-8")).resolves.toBeTruthy();
  });

  it("leaves no temporary file behind after a successful write", async () => {
    await writeSyncTimestamp({ presettDir: tempDir });

    await expect(
      readFile(join(tempDir, "sync-state.json.tmp"), "utf-8"),
    ).rejects.toThrow();
  });

  it("returns err when the destination cannot be replaced", async () => {
    // A directory at the destination forces rename to fail.
    await mkdir(join(tempDir, "sync-state.json"));
    const result = await writeSyncTimestamp({ presettDir: tempDir });

    expect(result.ok).toBe(false);
  });
});