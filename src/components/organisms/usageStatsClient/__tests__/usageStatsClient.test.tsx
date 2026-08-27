import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsageStatsClient } from "../usageStatsClient";
import { getUsageStats } from "@/services/usageStatsApiService";
import type { UsageStatsData } from "@/services/usageStatsService";

vi.mock("@/services/usageStatsApiService", () => ({ getUsageStats: vi.fn() }));

const data: UsageStatsData = {
  providers: [
    {
      provider: "anthropic",
      totalCostUsd: 1.25,
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalMessages: 3,
      sharePercent: 100,
      models: [
        { model: "claude-sonnet", costUsd: 1.25, inputTokens: 100, outputTokens: 50, messages: 3 },
      ],
    },
  ],
  recentSessions: [],
  totalSessions: 0,
  rangeLabel: "7d",
  generatedAt: "2026-08-26T00:00:00.000Z",
};

describe("UsageStatsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUsageStats).mockResolvedValue(data);
  });

  it("loads usage stats on mount with the default 7d range", async () => {
    render(<UsageStatsClient />);

    expect(screen.getByRole("status").textContent).toContain("Loading usage stats");
    await screen.findByText("anthropic");

    expect(getUsageStats).toHaveBeenCalledWith({ days: 7 });
  });

  it("surfaces a load error and retries with the same options", async () => {
    vi.mocked(getUsageStats).mockRejectedValue(new Error("Local service unavailable"));
    const user = userEvent.setup();
    render(<UsageStatsClient />);

    await screen.findByRole("alert");
    expect(screen.getByText("Local service unavailable")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(getUsageStats).toHaveBeenCalledTimes(2));
    expect(getUsageStats).toHaveBeenLastCalledWith({ days: 7 });
  });

  it("refetches when the time range changes", async () => {
    const user = userEvent.setup();
    render(<UsageStatsClient />);
    await screen.findByText("anthropic");

    await user.click(screen.getByRole("button", { name: "30d" }));

    await waitFor(() => expect(getUsageStats).toHaveBeenLastCalledWith({ days: 30 }));
  });

  it("refetches when a project directory filter is applied", async () => {
    const user = userEvent.setup();
    render(<UsageStatsClient />);
    await screen.findByText("anthropic");

    await user.type(screen.getByLabelText("Project directory"), "/home/user/proj");
    await user.click(screen.getByRole("button", { name: "Apply project filter" }));

    await waitFor(() =>
      expect(getUsageStats).toHaveBeenLastCalledWith({ days: 7, project: "/home/user/proj" }),
    );
  });

  it("keeps an empty project filter meaning 'all projects' (no project param)", async () => {
    const user = userEvent.setup();
    render(<UsageStatsClient />);
    await screen.findByText("anthropic");

    await user.click(screen.getByRole("button", { name: "Apply project filter" }));

    await waitFor(() => expect(getUsageStats).toHaveBeenLastCalledWith({ days: 7 }));
  });
});
