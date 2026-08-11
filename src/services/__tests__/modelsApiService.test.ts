import { describe, it, expect, vi } from "vitest";
import { getConfig, getCatalog, saveAssignment } from "@/services/modelsApiService";
import * as api from "@/services/api";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>(
    "@/services/api",
  );
  return {
    ...actual,
    get: vi.fn(),
    put: vi.fn(),
  };
});

describe("modelsApiService", () => {
  it("fetches config", async () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockResolvedValue({ assignments: [] });

    const result = await getConfig();

    expect(mockedGet).toHaveBeenCalledWith("/config");
    expect(result).toEqual({ assignments: [] });
  });

  it("fetches catalog", async () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockResolvedValue({ providers: [], catalog: {} });

    const result = await getCatalog();

    expect(mockedGet).toHaveBeenCalledWith("/models");
    expect(result).toEqual({ providers: [], catalog: {} });
  });

  it("saves an assignment", async () => {
    const mockedPut = vi.mocked(api.put);
    mockedPut.mockResolvedValue({ ok: true });

    const payload = {
      agentKey: "sdd-orchestrator-dev",
      provider: "openai",
      model: "gpt-4",
      variant: "high",
    };
    await saveAssignment(payload);

    expect(mockedPut).toHaveBeenCalledWith("/config", payload);
  });
});
