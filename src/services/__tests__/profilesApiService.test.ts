import { describe, it, expect, vi } from "vitest";
import {
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  getProfileDetail,
  updateProfile,
  repairProfile,
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
    put: vi.fn(),
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

  it("routes the empty-name (Base) switch to /profiles/base/switch, not an empty segment", async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValue({ ok: true });

    await switchProfile("");

    expect(mockedPost).toHaveBeenCalledWith("/profiles/base/switch");
  });

  it("deletes a profile", async () => {
    const mockedDel = vi.mocked(api.del);
    mockedDel.mockResolvedValue(undefined);

    await deleteProfile("dev");

    expect(mockedDel).toHaveBeenCalledWith("/profiles/dev");
  });

  it("fetches the detail of a profile via GET", async () => {
    const mockedGet = vi.mocked(api.get);
    const detail = {
      name: "dev",
      assignments: {
        "sdd-orchestrator-dev": { provider: "openai", model: "gpt-4", variant: "high" },
      },
    };
    mockedGet.mockResolvedValue(detail);

    const result = await getProfileDetail("dev");

    expect(mockedGet).toHaveBeenCalledWith("/profiles/dev");
    expect(result).toEqual(detail);
  });

  it("routes the empty-name (Base) detail to /profiles/base, not the list route", async () => {
    const mockedGet = vi.mocked(api.get);
    const baseDetail = {
      name: "",
      assignments: {
        "gentle-orchestrator": {
          provider: "openai",
          model: "gpt-4",
          variant: "low",
        },
      },
    };
    mockedGet.mockResolvedValue(baseDetail);

    const result = await getProfileDetail("");

    expect(mockedGet).toHaveBeenCalledWith("/profiles/base");
    expect(result).toEqual(baseDetail);
  });

  it("routes the empty-name (Base) save to /profiles/base, not the list route", async () => {
    const mockedPut = vi.mocked(api.put);
    mockedPut.mockResolvedValue({ ok: true });

    const assignments = {
      "gentle-orchestrator": { provider: "openai", model: "gpt-4", variant: "high" },
    };

    const result = await updateProfile("", assignments);

    expect(mockedPut).toHaveBeenCalledWith("/profiles/base", { assignments });
    expect(result).toEqual({ ok: true });
  });

  it("triggers a manual repair via POST to the repair sub-route", async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValue({ ok: true, backup: "/tmp/backup.json" });

    const result = await repairProfile("cheap");

    expect(mockedPost).toHaveBeenCalledWith("/profiles/cheap/repair");
    expect(result).toEqual({ ok: true, backup: "/tmp/backup.json" });
  });

  it("URL-encodes the profile segment when repairing", async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValue({ ok: true });

    await repairProfile("my profile");

    expect(mockedPost).toHaveBeenCalledWith("/profiles/my%20profile/repair");
  });
});
