import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUsageStats } from "@/services/usageStatsApiService";
import { get } from "@/services/api";
import type { UsageStatsData } from "@/services/usageStatsService";

vi.mock("@/services/api", () => ({ get: vi.fn() }));

const baseData: UsageStatsData = {
  providers: [],
  recentSessions: [],
  totalSessions: 0,
  rangeLabel: "7d",
  generatedAt: "2026-08-26T00:00:00.000Z",
};

describe("usageStatsApiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the contract endpoint with only days when no project is provided", async () => {
    vi.mocked(get).mockResolvedValue(baseData);

    await getUsageStats({ days: 7 });

    expect(get).toHaveBeenCalledWith("/usageStats?days=7");
  });

  it("includes the project query param, URL-encoded, when a directory is provided", async () => {
    vi.mocked(get).mockResolvedValue({ ...baseData, rangeLabel: "30d" });

    await getUsageStats({ days: 30, project: "/home/user/my project" });

    expect(get).toHaveBeenCalledWith(
      "/usageStats?days=30&project=%2Fhome%2Fuser%2Fmy+project",
    );
  });

  it("uses days=0 for the all-time range", async () => {
    vi.mocked(get).mockResolvedValue({ ...baseData, rangeLabel: "all" });

    await getUsageStats({ days: 0 });

    expect(get).toHaveBeenCalledWith("/usageStats?days=0");
  });

  it("resolves to the typed data returned by the endpoint", async () => {
    const payload: UsageStatsData = {
      providers: [
        {
          provider: "anthropic",
          totalCostUsd: 1.25,
          totalInputTokens: 100,
          totalOutputTokens: 50,
          totalMessages: 3,
          sharePercent: 100,
          models: [
            {
              model: "claude-sonnet",
              costUsd: 1.25,
              inputTokens: 100,
              outputTokens: 50,
              messages: 3,
            },
          ],
        },
      ],
      recentSessions: [],
      totalSessions: 7,
      rangeLabel: "7d",
      generatedAt: "2026-08-26T00:00:00.000Z",
    };
    vi.mocked(get).mockResolvedValue(payload);

    const result = await getUsageStats({ days: 7 });

    expect(result).toEqual(payload);
    expect(result.providers[0].provider).toBe("anthropic");
    expect(result.totalSessions).toBe(7);
  });
});
