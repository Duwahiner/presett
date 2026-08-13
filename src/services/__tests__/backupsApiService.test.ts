import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  deleteBackup,
  listBackups,
  pinBackup,
  restoreBackup,
  runSync,
  unpinBackup,
} from "@/services/backupsApiService";
import * as api from "@/services/api";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>(
    "@/services/api",
  );
  return {
    ...actual,
    get: vi.fn(),
    post: vi.fn(),
  };
});

describe("backupsApiService", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("lists backups", async () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockResolvedValue({ backups: [] });

    const result = await listBackups();

    expect(mockedGet).toHaveBeenCalledWith("/backups");
    expect(result).toEqual({ backups: [] });
  });

  it("runs sync", async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

    const result = await runSync();

    expect(mockedPost).toHaveBeenCalledWith("/sync");
    expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });

  it("sends confirmed intent for restore and delete only", async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValue(undefined);

    await restoreBackup("backup-1", { confirmed: true });
    await deleteBackup("backup-1", { confirmed: true });
    await pinBackup("backup-1");
    await unpinBackup("backup-1");

    expect(mockedPost).toHaveBeenNthCalledWith(1, "/backups/backup-1", {
      action: "restore",
      confirmed: true,
    });
    expect(mockedPost).toHaveBeenNthCalledWith(2, "/backups/backup-1", {
      action: "delete",
      confirmed: true,
    });
    expect(mockedPost).toHaveBeenNthCalledWith(3, "/backups/backup-1", {
      action: "pin",
    });
    expect(mockedPost).toHaveBeenNthCalledWith(4, "/backups/backup-1", {
      action: "unpin",
    });
  });
});
