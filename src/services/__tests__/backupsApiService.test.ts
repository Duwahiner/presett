import { describe, it, expect, vi } from "vitest";
import { listBackups, runSync } from "@/services/backupsApiService";
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
});
