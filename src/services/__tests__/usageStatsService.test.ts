import { describe, it, expect, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  escapeSqlLiteral,
  buildProviderUsageSql,
  buildRecentSessionsSql,
  buildDbArgs,
  resolveCost,
  collectUsageStats,
  clearUsageStatsCache,
  type DaysFilter,
  type UsageStatsOptions,
} from "../usageStatsService";

type ExecResult = { stdout: string; stderr: string };
type ExecFileOptions = { maxBuffer: number; timeout: number; shell: boolean };
type ExecCall = { file: string; args: string[]; options: ExecFileOptions };

function fakeExecFile(
  providerRows: unknown[],
  sessionRows: unknown[],
  calls: ExecCall[],
): (file: string, args: string[], options: ExecFileOptions) => Promise<ExecResult> {
  return async (file: string, args: string[], options: ExecFileOptions): Promise<ExecResult> => {
    calls.push({ file, args, options });
    if (args[1].includes("GROUP BY provider, model")) {
      return { stdout: JSON.stringify(providerRows), stderr: "" };
    }
    if (args[1].includes("GROUP BY session_id")) {
      return { stdout: JSON.stringify(sessionRows), stderr: "" };
    }
    throw new Error(`Unexpected args: ${JSON.stringify(args)}`);
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
    title: "Session A",
    project_path: "/proj/a",
    last_updated_at: 300,
    message_count: 5,
    total_cost: 0.01,
    input_tokens: 100,
    output_tokens: 50,
    providers: "openai,anthropic",
    total_sessions: 2,
  },
  {
    session_id: "s2",
    title: "",
    project_path: null,
    last_updated_at: 200,
    message_count: 2,
    total_cost: 0,
    input_tokens: 10,
    output_tokens: 0,
    providers: "openai",
    total_sessions: 2,
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

  describe("buildDbArgs (no-shell argument passing)", () => {
    it("passes the SQL verbatim as a single argv element (db <sql> --format json)", () => {
      const sql = "SELECT 1";
      const args = buildDbArgs(sql);
      expect(args).toEqual(["db", sql, "--format", "json"]);
      expect(args).toHaveLength(4);
      expect(args[1]).toBe(sql);
    });

    it("preserves multi-line SQL and JSON paths untouched (no shell to collapse or escape)", () => {
      const sql = buildRecentSessionsSql({ days: 7 });
      const args = buildDbArgs(sql);
      // Newlines and $ are safe because the SQL travels as one argv element, not
      // through a shell command line.
      expect(args[1]).toBe(sql);
      expect(args[1]).toContain("\n");
      expect(args[1]).toContain("$.cost");
      expect(args[1]).toContain("$.path.cwd");
    });

    it("keeps shell-metacharacter project values literal in a single SQL argument", () => {
      const dangerous = 'C:\\dev;foo"bar&baz|qux%HOME%`echo`$HOME';
      const sql = buildProviderUsageSql({ days: 7, project: dangerous });
      const args = buildDbArgs(sql);
      // The path must arrive as one argv element, unchanged, so no shell can
      // expand %HOME%, chain & or |, or break out of a double quote.
      expect(args).toHaveLength(4);
      expect(args[1]).toContain('= \'C:\\dev;foo"bar&baz|qux%HOME%`echo`$HOME\'');
      // No shell-escape backslashes are introduced — the old shell-wrapping
      // hack must not be present.
      expect(args[1]).not.toContain("\\\"");
    });

    it("never needs a shell to separate the SQL argument from the CLI flags", () => {
      const sql = buildProviderUsageSql({ days: 0 });
      const args = buildDbArgs(sql);
      expect(args[0]).toBe("db");
      expect(args[2]).toBe("--format");
      expect(args[3]).toBe("json");
      // The SQL is a single element between db and --format, never shell-split.
      expect(args.filter((part) => part.includes("json_extract"))).toHaveLength(1);
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

    it("joins the session table for the canonical title", () => {
      const sql = buildRecentSessionsSql({ days: 0 });
      expect(sql).toContain("JOIN session ON session.id = message.session_id");
      expect(sql).toContain("session.title");
    });

    it("computes the total matching session count via a window count BEFORE the LIMIT", () => {
      const sql = buildRecentSessionsSql({ days: 0 });
      // Window function over the grouped rows: COUNT(*) OVER () reflects the full
      // matched set, not the 5 rows kept by LIMIT.
      expect(sql).toMatch(/COUNT\(\*\) OVER \(\) AS total_sessions/);
      const limitIndex = sql.indexOf("LIMIT 5");
      const windowIndex = sql.indexOf("COUNT(*) OVER ()");
      expect(windowIndex).toBeGreaterThan(-1);
      expect(windowIndex).toBeLessThan(limitIndex);
    });

    it("keeps the days/project filters inside the grouped subquery that feeds the total count", () => {
      const sql = buildRecentSessionsSql({ days: 7, project: "/proj" });
      expect(sql).toContain("message.time_created >= strftime('%s','now','-7 days') * 1000");
      expect(sql).toContain("$.path.cwd') = '/proj'");
      expect(sql).toMatch(/COUNT\(\*\) OVER \(\)/);
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
    it("invokes execFile with opencode and the SQL as a single argv element, no shell", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

      await collectUsageStats({ days: 7, project: "/proj" }, execFn);

      expect(calls).toHaveLength(2);
      for (const call of calls) {
        expect(call.file).toBe("opencode");
        expect(call.args[0]).toBe("db");
        expect(call.args).toContain("--format");
        expect(call.args).toContain("json");
        expect(call.args).toHaveLength(4);
        expect(call.options.shell).toBe(false);
        expect(call.options.timeout).toBeGreaterThan(0);
        expect(call.options.maxBuffer).toBeGreaterThan(0);
      }
      const providerCall = calls.find((c) => c.args[1].includes("GROUP BY provider, model"));
      expect(providerCall).toBeDefined();
      expect(providerCall!.args[1]).toContain("$.path.cwd') = '/proj'");
    });

    it("aggregates provider usage from CLI output", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

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
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const anthropic = result.value.providers.find((p) => p.provider === "anthropic");
      expect(anthropic?.totalCostUsd).toBeNull();
      expect(anthropic?.models[0].costUsd).toBeNull();
    });

    it("computes sharePercent relative to visible providers by tokens", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

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
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

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

    it("reports the total matching session count even when the list is capped at 5", async () => {
      // The window count is carried on every returned row, so the service reports
      // the FULL matching count while recentSessions stays capped at 5. This
      // guards the "do not count only five rows" rule.
      const fiveRows = Array.from({ length: 5 }, (_, index) => ({
        session_id: `s${index + 1}`,
        title: `Session ${index + 1}`,
        project_path: null,
        last_updated_at: 500 - index,
        message_count: 1,
        total_cost: 0,
        input_tokens: 0,
        output_tokens: 0,
        providers: "",
        total_sessions: 12,
      }));
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, fiveRows, calls);

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions).toHaveLength(5);
      expect(result.value.totalSessions).toBe(12);
    });

    it("reports totalSessions as 0 when no sessions match the filter", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, [], calls);

      const result = await collectUsageStats({ days: 7, project: "/no-such-project" }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions).toHaveLength(0);
      expect(result.value.totalSessions).toBe(0);
    });

    it("carries the canonical session title from the session join", async () => {
      const calls: ExecCall[] = [];
      const rows = [
        {
          session_id: "s1",
          title: "Mi sesión de análisis",
          project_path: "/proj/a",
          last_updated_at: 300,
          message_count: 5,
          total_cost: 0.01,
          input_tokens: 100,
          output_tokens: 50,
          providers: "openai",
          total_sessions: 1,
        },
      ];
      const execFn = fakeExecFile(PROVIDER_ROWS, rows, calls);

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions[0].title).toBe("Mi sesión de análisis");
    });

    it("sets the rangeLabel from the days filter", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

      const all = await collectUsageStats({ days: 0 }, execFn);
      expect(all.ok && all.value.rangeLabel).toBe("all");

      const d7 = await collectUsageStats({ days: 7 }, execFn);
      expect(d7.ok && d7.value.rangeLabel).toBe("7d");

      const d30 = await collectUsageStats({ days: 30 }, execFn);
      expect(d30.ok && d30.value.rangeLabel).toBe("30d");
    });

    it("serves cached results within the TTL without re-invoking the CLI", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

      await collectUsageStats({ days: 7, project: "/proj" }, execFn);
      await collectUsageStats({ days: 7, project: "/proj" }, execFn);

      // 2 queries (provider + sessions) for the first call, 0 for the cached second call
      expect(calls).toHaveLength(2);
    });

    it("uses a distinct cache entry per days:project key", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(PROVIDER_ROWS, SESSION_ROWS, calls);

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

  describe("collectUsageStats integration via real opencode, no shell (regression: 'incomplete input' + metacharacter injection)", () => {
    // The real CLI can take several seconds and vitest's default 5000ms timeout
    // is too tight under parallel test load, so allow a generous window (the
    // service itself caps execFile at CLI_TIMEOUT_MS = 10s).
    it("runs the recent-sessions query through execFile with shell:false and succeeds", async () => {
      // Regression: the old approach wrapped the query in a shell command string.
      // cmd.exe truncated embedded newlines and corrupted JSON paths ('$.cost' ->
      // '\$.cost'), causing "incomplete input" and a 503. Now the SQL travels as
      // a single argv element via execFile(..., { shell: false }): no shell to
      // truncate newlines, expand %, or mangle JSON paths. This exercises the
      // exact production no-shell path.
      const availability = spawnSync("opencode", ["--version"], { encoding: "utf8" });
      if (availability.error || availability.status !== 0) {
        // opencode is not installed here — nothing to exercise, skip gracefully.
        return;
      }

      const result = await collectUsageStats({ days: 7 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value.providers)).toBe(true);
        expect(Array.isArray(result.value.recentSessions)).toBe(true);
      }
    }, 15_000);

    it("runs a metacharacter project filter through actual SQLite without breaking", async () => {
      // Threat matrix: a project value containing " & | %VAR% ` $ is passed as a
      // single argv element, so no shell can expand or chain it. SQLite treats
      // the value as a literal string and simply matches nothing (empty result),
      // proving execution survives the dangerous characters end to end.
      const availability = spawnSync("opencode", ["--version"], { encoding: "utf8" });
      if (availability.error || availability.status !== 0) {
        return;
      }

      const dangerous = 'C:\\dev;foo"bar&baz|qux%HOME%`echo`$HOME';
      const result = await collectUsageStats({ days: 7, project: dangerous });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value.providers)).toBe(true);
        expect(Array.isArray(result.value.recentSessions)).toBe(true);
      }
    }, 15_000);
  });
});

export type { DaysFilter, UsageStatsOptions };