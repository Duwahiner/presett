import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "@/resources/resources";
import type { UsageStatsData } from "@/services/usageStatsService";
import { UsageStatsClientView } from "../usageStatsClient.view";

// Deterministic timezone for the session-timestamp regression test: pin the
// runtime timezone so a "Z" (UTC) ISO timestamp renders in a known local zone
// rather than being force-formatted as UTC. Vitest isolates each test file in
// its own fork, so this mutation does not affect other suites.
process.env.TZ = "America/New_York";

const data: UsageStatsData = {
  providers: [
    {
      provider: "anthropic",
      totalCostUsd: 1.25,
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalMessages: 3,
      sharePercent: 60,
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
    {
      provider: "openai",
      totalCostUsd: null,
      totalInputTokens: 40,
      totalOutputTokens: 20,
      totalMessages: 2,
      sharePercent: 40,
      models: [
        {
          model: "gpt-4o",
          costUsd: null,
          inputTokens: 40,
          outputTokens: 20,
          messages: 2,
        },
      ],
    },
  ],
  recentSessions: [
    {
      sessionId: "sess-abc",
      title: "Análisis de costos",
      projectPath: "/home/user/proj",
      lastUpdatedAt: "2026-08-25T10:00:00.000Z",
      messageCount: 4,
      totalCostUsd: 0.5,
      totalInputTokens: 30,
      totalOutputTokens: 15,
      providers: ["anthropic"],
    },
    {
      sessionId: "sess-def",
      title: null,
      projectPath: null,
      lastUpdatedAt: "2026-08-24T09:00:00.000Z",
      messageCount: 2,
      totalCostUsd: null,
      totalInputTokens: 10,
      totalOutputTokens: 5,
      providers: ["openai"],
    },
  ],
  totalSessions: 12,
  rangeLabel: "7d",
  generatedAt: "2026-08-26T00:00:00.000Z",
};

function renderView(overrides: Partial<ComponentProps<typeof UsageStatsClientView>> = {}) {
  const props: ComponentProps<typeof UsageStatsClientView> = {
    data,
    loading: false,
    error: null,
    days: 7,
    project: "",
    onDaysChange: vi.fn(),
    onProjectApply: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<UsageStatsClientView {...props} />);
  return props;
}

describe("UsageStatsClientView", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("shows the loading state with a status announcement", () => {
    renderView({ loading: true, data: null });

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Loading usage stats");
  });

  it("shows an error banner with a working retry action", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderView({ error: "Local service unavailable", onRetry });

    expect(screen.getByRole("alert")).not.toBeNull();
    expect(screen.getByText("Local service unavailable")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the empty state when no provider or session activity exists", () => {
    renderView({
      data: {
        providers: [],
        recentSessions: [],
        totalSessions: 0,
        rangeLabel: "7d",
        generatedAt: "2026-08-26T00:00:00.000Z",
      },
    });

    expect(screen.getByText("No usage data")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /expand provider/i })).toBeNull();
  });

  it("renders active providers and their summary from the API", () => {
    renderView();

    // Provider cards render for every active provider returned by the API
    expect(screen.getByRole("button", { name: "Expand provider anthropic" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Expand provider openai" })).not.toBeNull();

    // Provider collapsed summary shows its real cost and share
    const anthropicCard = screen.getByTestId("usageStatsProvider-anthropic");
    expect(within(anthropicCard).getByText("$1.25")).not.toBeNull();
    expect(within(anthropicCard).getByText("60%")).not.toBeNull();

    // Aggregate summary reflects the loaded data
    const summary = screen.getByTestId("usageStatsSummary");
    expect(within(summary).getByText("Providers")).not.toBeNull();
    expect(within(summary).getByText("Sessions")).not.toBeNull();
    expect(within(summary).getByText("$1.25")).not.toBeNull();
    expect(within(summary).getByText("210")).not.toBeNull();

    expect(screen.getByText("Recent sessions")).not.toBeNull();
  });

  it("shows the total matching session count in the summary, not the capped list length", () => {
    // totalSessions = 12 while only 2 session cards render — the summary must
    // surface the FULL matched count, not recentSessions.length.
    renderView();

    const summary = screen.getByTestId("usageStatsSummary");
    expect(within(summary).getByText("12")).not.toBeNull();

    const sessionCards = screen.getAllByTestId(/^usageStatsSession-/);
    expect(sessionCards).toHaveLength(2);
  });

  it("renders each session heading as the title concatenated with a shortened session id", () => {
    renderView({
      data: {
        ...data,
        recentSessions: [
          {
            sessionId: "ses_fbeeb882cffe9uHXh1t55uPkOq",
            title: "Análisis de costos",
            projectPath: "/proj",
            lastUpdatedAt: "2026-08-25T10:00:00.000Z",
            messageCount: 3,
            totalCostUsd: 0.5,
            totalInputTokens: 30,
            totalOutputTokens: 15,
            providers: ["anthropic"],
          },
        ],
      },
    });

    const sessionButton = screen.getByRole("button", {
      name: /expand session ses_fbeeb882cffe9uHXh1t55uPkOq/i,
    });
    expect(sessionButton.textContent).toContain("Análisis de costos · fbeeb882cf");
  });

  it("falls back to an untitled label when the session title is blank", () => {
    renderView({
      data: {
        ...data,
        recentSessions: [
          {
            sessionId: "ses_fbeeb882cffe9uHXh1t55uPkOq",
            title: null,
            projectPath: null,
            lastUpdatedAt: "2026-08-25T10:00:00.000Z",
            messageCount: 1,
            totalCostUsd: null,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            providers: [],
          },
        ],
      },
    });

    const sessionButton = screen.getByRole("button", {
      name: /expand session ses_fbeeb882cffe9uHXh1t55uPkOq/i,
    });
    expect(sessionButton.textContent).toContain("Untitled · fbeeb882cf");
  });

  it("renders the provider cost-unavailable state as 'Costo no disponible' in Spanish", async () => {
    setLocale("es");
    const user = userEvent.setup();
    renderView();

    // openai has tokens but zero cost -> "Costo no disponible" already on its collapsed header
    const providerButton = screen.getByRole("button", { name: /expandir proveedor openai/i });
    expect(screen.getAllByText("Costo no disponible").length).toBeGreaterThanOrEqual(1);

    await user.click(providerButton);

    // Expanding reveals the per-model row also marked as cost unavailable
    expect(screen.getAllByText("Costo no disponible").length).toBeGreaterThanOrEqual(2);
  });

  it("expands a provider to reveal its model table and per-model cost", async () => {
    const user = userEvent.setup();
    renderView();

    const anthropicButton = screen.getByRole("button", { name: /expand provider anthropic/i });
    expect(anthropicButton.getAttribute("aria-expanded")).toBe("false");

    await user.click(anthropicButton);

    expect(anthropicButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("claude-sonnet")).not.toBeNull();
  });

  it("toggles provider details via keyboard (Enter on a focused button)", async () => {
    const user = userEvent.setup();
    renderView();

    const providerButton = screen.getByRole("button", { name: /expand provider anthropic/i });
    providerButton.focus();
    await user.keyboard("{Enter}");

    expect(providerButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("claude-sonnet")).not.toBeNull();
  });

  it("renders session timestamps in the local runtime timezone, not UTC", () => {
    renderView();
    // sess-abc lastUpdatedAt is 2026-08-25T10:00:00.000Z, which is 6:00 AM in
    // America/New_York (UTC-4). It must render as the local 6:00 AM, not the
    // UTC 10:00 AM.
    const sessionButton = screen.getByRole("button", { name: /expand session sess-abc/i });
    expect(sessionButton.textContent).toContain("25 de agosto de 2026, 6:00 am");
  });

  it("collapses session cards by default and reveals details only after activation", async () => {
    const user = userEvent.setup();
    renderView();

    const sessionButton = screen.getByRole("button", { name: /expand session sess-abc/i });
    // Sessions are collapsed by default (approved product rule): aria-expanded starts false
    expect(sessionButton.getAttribute("aria-expanded")).toBe("false");

    // Detail data is NOT in the DOM until the card is activated
    const sessionCard = screen.getByTestId("usageStatsSession-sess-abc");
    expect(within(sessionCard).queryByText("$0.50")).toBeNull();
    expect(within(sessionCard).queryByText("anthropic")).toBeNull();

    // Click reveals the required expanded detail
    await user.click(sessionButton);
    expect(sessionButton.getAttribute("aria-expanded")).toBe("true");
    expect(within(sessionCard).getByText("$0.50")).not.toBeNull();
    expect(within(sessionCard).getByText("anthropic")).not.toBeNull();

    // Activating again collapses and removes the detail from the DOM
    await user.click(sessionButton);
    expect(sessionButton.getAttribute("aria-expanded")).toBe("false");
    expect(within(sessionCard).queryByText("$0.50")).toBeNull();
  });

  it("reveals session details via keyboard (Enter on a focused button)", async () => {
    const user = userEvent.setup();
    renderView();

    const sessionButton = screen.getByRole("button", { name: /expand session sess-abc/i });
    expect(sessionButton.getAttribute("aria-expanded")).toBe("false");

    sessionButton.focus();
    await user.keyboard("{Enter}");

    expect(sessionButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("$0.50")).not.toBeNull();
  });

  it("calls onDaysChange when a range button is selected and reflects aria-pressed", async () => {
    const onDaysChange = vi.fn();
    const user = userEvent.setup();
    renderView({ onDaysChange, days: 7 });

    const range30d = screen.getByRole("button", { name: "30d" });
    const rangeAll = screen.getByRole("button", { name: "All" });
    expect(screen.getByRole("button", { name: "7d" }).getAttribute("aria-pressed")).toBe("true");
    expect(range30d.getAttribute("aria-pressed")).toBe("false");

    await user.click(range30d);
    expect(onDaysChange).toHaveBeenCalledWith(30);

    await user.click(rangeAll);
    expect(onDaysChange).toHaveBeenCalledWith(0);
  });

  it("applies the project directory filter on submit", async () => {
    const onProjectApply = vi.fn();
    const user = userEvent.setup();
    renderView({ onProjectApply });

    const input = screen.getByLabelText("Project directory");
    await user.type(input, "/home/user/proj");
    await user.click(screen.getByRole("button", { name: "Apply project filter" }));

    expect(onProjectApply).toHaveBeenCalledWith("/home/user/proj");
  });

  it("exposes a single shared scroll region containing both providers and sessions", () => {
    renderView();

    const scrollRegions = screen.getAllByTestId("usageStatsScroll");
    expect(scrollRegions).toHaveLength(1);

    const scroll = scrollRegions[0];
    expect(scroll.className).toContain("min-h-0");
    expect(scroll.className).toContain("flex-1");
    expect(scroll.className).toContain("overflow-y-auto");
    expect(scroll.className).toContain("scrollbar-brutal");

    // Providers and sessions share the SAME scroll region (no independent columns)
    expect(within(scroll).getByRole("button", { name: "Expand provider anthropic" })).not.toBeNull();
    expect(within(scroll).getByRole("button", { name: "Expand session sess-abc" })).not.toBeNull();
  });
});
