import { describe, expect, it } from "vitest";
import { filterAndSortBackups } from "../filterAndSortBackups";
import type { BackupInfo } from "../BackupsClient.types";

const a: BackupInfo = {
  id: "backup-alpha",
  source: "manual",
  timestamp: "2026-08-10T20:00:00Z",
  fileCount: 10,
  size: 4096,
  pinned: true,
};
const b: BackupInfo = {
  id: "backup-beta",
  source: "auto",
  timestamp: "2026-08-12T12:00:00Z",
  fileCount: 3,
  size: 1024,
  pinned: false,
};
const c: BackupInfo = {
  id: "backup-gamma",
  source: "manual",
  timestamp: "2026-08-11T08:00:00Z",
  fileCount: 7,
  size: 2048,
  pinned: true,
};

const defaults = {
  search: "",
  activeFilters: {} as Record<string, string>,
  sortField: "timestamp",
  sortDir: "desc" as const,
};

describe("filterAndSortBackups", () => {
  // --- text search ---
  it("matches backup id containing the search term", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, search: "alpha" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("backup-alpha");
  });

  it("matches backup source containing the search term", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, search: "auto" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("backup-beta");
  });

  it("search is case-insensitive", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, search: "ALPHA" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("backup-alpha");
  });

  // --- pinned filter ---
  it("filters to pinned-only when pinned filter is active", () => {
    const result = filterAndSortBackups([a, b, c], {
      ...defaults,
      activeFilters: { pinned: "true" },
    });
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.pinned)).toBe(true);
  });

  it("returns all when pinned filter is not active", () => {
    const result = filterAndSortBackups([a, b, c], {
      ...defaults,
      activeFilters: {},
    });
    expect(result).toHaveLength(3);
  });

  // --- combined search + pinned ---
  it("combines search and pinned filter", () => {
    const result = filterAndSortBackups([a, b, c], {
      ...defaults,
      search: "manual",
      activeFilters: { pinned: "true" },
    });
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.pinned && b.source === "manual")).toBe(true);
  });

  // --- sort: timestamp desc (default) ---
  it("sorts by timestamp descending by default", () => {
    const result = filterAndSortBackups([a, b, c], defaults);
    expect(result.map((b) => b.id)).toEqual(["backup-beta", "backup-gamma", "backup-alpha"]);
  });

  // --- sort: timestamp asc ---
  it("sorts by timestamp ascending", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, sortDir: "asc" });
    expect(result.map((b) => b.id)).toEqual(["backup-alpha", "backup-gamma", "backup-beta"]);
  });

  // --- sort: size ---
  it("sorts by size descending", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, sortField: "size", sortDir: "desc" });
    expect(result.map((b) => b.id)).toEqual(["backup-alpha", "backup-gamma", "backup-beta"]);
  });

  it("sorts by size ascending", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, sortField: "size", sortDir: "asc" });
    expect(result.map((b) => b.id)).toEqual(["backup-beta", "backup-gamma", "backup-alpha"]);
  });

  // --- sort: fileCount ---
  it("sorts by fileCount descending", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, sortField: "fileCount", sortDir: "desc" });
    expect(result.map((b) => b.id)).toEqual(["backup-alpha", "backup-gamma", "backup-beta"]);
  });

  it("sorts by fileCount ascending", () => {
    const result = filterAndSortBackups([a, b, c], { ...defaults, sortField: "fileCount", sortDir: "asc" });
    expect(result.map((b) => b.id)).toEqual(["backup-beta", "backup-gamma", "backup-alpha"]);
  });

  // --- stable secondary sort by id ---
  it("uses id as secondary sort when primary values are equal", () => {
    const d1: BackupInfo = { ...a, id: "z-equal", size: 100 };
    const d2: BackupInfo = { ...a, id: "a-equal", size: 100 };
    const result = filterAndSortBackups([d1, d2], { ...defaults, sortField: "size", sortDir: "desc" });
    expect(result.map((b) => b.id)).toEqual(["a-equal", "z-equal"]);
  });

  // --- empty input ---
  it("returns empty array for empty input", () => {
    const result = filterAndSortBackups([], defaults);
    expect(result).toEqual([]);
  });
});
