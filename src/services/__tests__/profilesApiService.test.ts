import { describe, it, expect, vi } from "vitest";
import {
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
} from "@/services/profilesApiService";
import * as api from "@/services/api";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>(
    "@/services/api",
  );
  return {
    ...actual,
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
  };
});

describe("profilesApiService", () => {
  it("lists profiles", async () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockResolvedValue({ profiles: [] });

    const result = await listProfiles();

    expect(mockedGet).toHaveBeenCalledWith("/profiles");
    expect(result).toEqual({ profiles: [] });
  });

  it("creates a profile", async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValue({ ok: true });

    const payload = { name: "dev", assignments: {} };
    await createProfile(payload);

    expect(mockedPost).toHaveBeenCalledWith("/profiles", payload);
  });

  it("switches to a profile", async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValue({ ok: true });

    await switchProfile("dev");

    expect(mockedPost).toHaveBeenCalledWith("/profiles/dev/switch");
  });

  it("deletes a profile", async () => {
    const mockedDel = vi.mocked(api.del);
    mockedDel.mockResolvedValue(undefined);

    await deleteProfile("dev");

    expect(mockedDel).toHaveBeenCalledWith("/profiles/dev");
  });
});
