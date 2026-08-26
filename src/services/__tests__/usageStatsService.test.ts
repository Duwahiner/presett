import { describe, it, expect, beforeEach } from "vitest";
import {
  escapeSqlLiteral,
  escapeShellArgument,
  buildProviderUsageSql,
  buildRecentSessionsSql,
  resolveCost,
  collectUsageStats,
  clearUsageStatsCache,
  type DaysFilter,
  type UsageStatsOptions,
} from "../usageStatsService";

type ExecResult = { stdout: string; stderr: string };

function fakeExec(
  providerRows: unknown[],
  sessionRows: unknown[],
  calls: { command: string }[],
): (command: string) => Promise<ExecResult> {
  return async (command: string): Promise<ExecResult> => {
    calls.push({ command });
    if (command.includes("GROUP BY provider, model")) {
      return { stdout: JSON.stringify(providerRows), stderr: "" };
    }
    if (command.includes("GROUP BY session_id")) {
      return { stdout: JSON.stringify(sessionRows), stderr: "" };
    }
    throw new Error(`Unexpected command: ${command}`);
  };
}

const PROVIDER_ROWS = [
  { provider: "openai", model: "gpt-4", total_cost: 0.02, input_tokens: 1000, output_tokens: 500, messages: 3 },
  { provider: "openai", model: "gpt-5", total_cost: 0.03, input_tokens: 2000, output_tokens: 700, messages: 4 },
  { provider: "anthropic", model: "claude-3", total_cost: 0, input_tokens: 600, output_tokens: 300, messages: 2 },
];

const SESSION_ROWS = [
  {
    session_id: "s1",
    project_path: "/proj/a",
    last_updated_at: 300,
    message_count: 5,
    total_cost: 0.01,
    input_tokens: 100,
    output_tokens: 50,
    providers: "openai,anthropic",
  },
  {
    session_id: "s2",
    project_path: null,
    last_updated_at: 200,
    message_count: 2,
    total_cost: 0,
    input_tokens: 10,
    output_tokens: 0,
    providers: "openai",
  },
];

describe("usageStatsService", () => {
  beforeEach(() => {
    clearUsageStatsCache();
  });

  describe("escapeSqlLiteral", () => {
    it("doubles single quotes to prevent SQL injection", () => {
      expect(escapeSqlLiteral("O'Brien")).toBe("O''Brien");
    });

    it("doubles every single quote in a multi-quote string", () => {
      expect(escapeSqlLiteral("a'b'c")).toBe("a''b''c");
    });

    it("rejects null bytes before the value can reach SQL", () => {
      expect(() => escapeSqlLiteral("a\x00b")).toThrow();
    });

    it("returns an empty string unchanged", () => {
      expect(escapeSqlLiteral("")).toBe("");
    });
  });

  describe("escapeShellArgument", () => {
    it("escapes double quotes and shell-active characters in a path", () => {
      const escaped = escapeShellArgument("C:\\dev;\"rm\"`x`$y");
      // each shell-active char must be backslash-escaped (neutralized inside
      // a double-quoted shell argument)
      expect(escaped).toContain('\\"');
      expect(escaped).toContain("\\`");
      expect(escaped).toContain("\\$");
    });
  });

  describe("buildProviderUsageSql", () => {
    it("includes a time clause for days=7 with the correct window", () => {
      const sql = buildProviderUsageSql({ days: 7 });
      expect(sql).toContain("time_created >= strftime('%s','now','-7 days') * 1000");
    });

    it("includes a time clause for days=30 with the correct window", () => {
      const sql = buildProviderUsageSql({ days: 30 });
      expect(sql).toContain("time_created >= strftime('%s','now','-30 days') * 1000");
    });

    it("omits the time clause when days=0 (all)", () => {
      const sql = buildProviderUsageSql({ days: 0 });
      expect(sql).not.toContain("strftime");
    });

    it("escapes a project path containing a SQL injection attempt", () => {
      const sql = buildProviderUsageSql({ days: 7, project: "' OR 1=1--" });
      expect(sql).toContain("= ''' OR 1=1--'");
      expect(sql).not.toContain(" = ' OR 1=1--'");
    });
  });

  describe("buildRecentSessionsSql", () => {
    it("uses the session_id column and limits to 5 most recent", () => {
      const sql = buildRecentSessionsSql({ days: 0 });
      expect(sql).toContain("session_id");
      expect(sql).toContain("GROUP BY session_id");
      expect(sql).toContain("ORDER BY last_updated_at DESC");
      expect(sql).toContain("LIMIT 5");
    });
  });

  describe("resolveCost", () => {
    it("returns the cost when cost is greater than zero", () => {
      expect(resolveCost(0.05, 1000, 500)).toBe(0.05);
    });

    it("returns null (unavailable) when cost is zero but tokens were used", () => {
      expect(resolveCost(0, 600, 300)).toBeNull();
      expect(resolveCost(0, 0, 10)).toBeNull();
    });

    it("returns 0 when cost is zero and no tokens were used", () => {
      expect(resolveCost(0, 0, 0)).toBe(0);
    });
  });

  describe("collectUsageStats", () => {
    it("aggregates provider usage from CLI output", async () => {
      const calls: { command: string }[] = [];
      const execFn = fakeExec(PROVIDER_ROWS, SESSION_ROWS, calls);

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.providers).toHaveLength(2);

      const openai = result.value.providers.find((p) => p.provider === "openai");
      expect(openai).toBeDefined();
      expect(openai?.totalCostUsd).toBe(0.05);
      expect(openai?.totalInputTokens).toBe(3000);
      expect(openai?.totalOutputTokens).toBe(1200);
      expect(openai?.totalMessages).toBe(7);
      expect(openai?.models).toHaveLength(2);
      expect(openai?.models[0]).toMatchObject({ model: "gpt-4", costUsd: 0.02 });
      expect(openai?.models[1]).toMatchObject({ model: "gpt-5", costUsd: 0.03 });
    });

    it("maps zero-cost-with-tokens to null costUsd (cost unavailable)", async () => {
      const calls: { command: string }[] = [];
      const execFn = fakeExec(PROVIDER_ROWS, SESSION_ROWS, calls);

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const anthropic = result.value.providers.find((p) => p.provider === "anthropic");
      expect(anthropic?.totalCostUsd).toBeNull();
      expect(anthropic?.models[0].costUsd).toBeNull();
    });

    it("computes sharePercent relative to visible providers by tokens", async () => {
      const calls: { command: string }[] = [];
      const execFn = fakeExec(PROVIDER_ROWS, SESSION_ROWS, calls);

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const openai = result.value.providers.find((p) => p.provider === "openai");
      const anthropic = result.value.providers.find((p) => p.provider === "anthropic");
      const total = openai!.sharePercent + anthropic!.sharePercent;
      expect(openai!.sharePercent).toBeGreaterThan(anthropic!.sharePercent);
      expect(total).toBe(100);
    });

    it("returns the 5 most recent sessions with derived providers array", async () => {
      const calls: { command: string }[] = [];
      const execFn = fakeExec(PROVIDER_ROWS, SESSION_ROWS, calls);

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions).toHaveLength(2);
      expect(result.value.recentSessions[0].sessionId).toBe("s1");
      expect(result.value.recentSessions[0].providers).toEqual(["openai", "anthropic"]);
      expect(result.value.recentSessions[0].totalCostUsd).toBe(0.01);
      expect(result.value.recentSessions[1].sessionId).toBe("s2");
      expect(result.value.recentSessions[1].projectPath).toBeNull();
      expect(result.value.recentSessions[1].totalCostUsd).toBeNull();
    });

    it("sets the rangeLabel from the days filter", async () => {
      const calls: { command: string }[] = [];
      const execFn = fakeExec(PROVIDER_ROWS, SESSION_ROWS, calls);

      const all = await collectUsageStats({ days: 0 }, execFn);
      expect(all.ok && all.value.rangeLabel).toBe("all");

      const d7 = await collectUsageStats({ days: 7 }, execFn);
      expect(d7.ok && d7.value.rangeLabel).toBe("7d");

      const d30 = await collectUsageStats({ days: 30 }, execFn);
      expect(d30.ok && d30.value.rangeLabel).toBe("30d");
    });

    it("serves cached results within the TTL without re-invoking the CLI", async () => {
      const calls: { command: string }[] = [];
      const execFn = fakeExec(PROVIDER_ROWS, SESSION_ROWS, calls);

      await collectUsageStats({ days: 7, project: "/proj" }, execFn);
      await collectUsageStats({ days: 7, project: "/proj" }, execFn);

      // 2 queries (provider + sessions) for the first call, 0 for the cached second call
      expect(calls).toHaveLength(2);
    });

    it("uses a distinct cache entry per days:project key", async () => {
      const calls: { command: string }[] = [];
      const execFn = fakeExec(PROVIDER_ROWS, SESSION_ROWS, calls);

      await collectUsageStats({ days: 7, project: "/proj" }, execFn);
      await collectUsageStats({ days: 30, project: "/proj" }, execFn);

      // 4 total exec calls: 2 per distinct key
      expect(calls).toHaveLength(4);
    });

    it("returns an error Result when the CLI is unavailable (ENOENT)", async () => {
      const execFn = async (): Promise<ExecResult> => {
        const error = new Error("spawn opencode ENOENT") as Error & { code?: string };
        error.code = "ENOENT";
        throw error;
      };

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("FILE_MISSING");
    });

    it("returns an error Result when the CLI exceeds the timeout", async () => {
      const execFn = async (): Promise<ExecResult> => {
        const error = new Error("Command timed out") as Error & { code?: string };
        error.code = "ETIMEDOUT";
        throw error;
      };

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("FILE_MISSING");
    });

    it("returns an error Result when CLI output is not valid JSON", async () => {
      const execFn = async (): Promise<ExecResult> => ({ stdout: "not json", stderr: "" });

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PARSE_FAILED");
    });
  });
});

export type { DaysFilter, UsageStatsOptions };
