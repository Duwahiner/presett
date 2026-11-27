import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveCost,
  collectUsageStats,
  clearUsageStatsCache,
  type DaysFilter,
  type UsageStatsOptions,
} from "../usageStatsService";

type ExecResult = { stdout: string; stderr: string };
type ExecFileOptions = { maxBuffer: number; timeout: number; shell: boolean; cwd?: string };
type ExecCall = { file: string; args: string[]; options: ExecFileOptions };
type ExecFn = (file: string, args: string[], options: ExecFileOptions) => Promise<ExecResult>;

const NOW = Date.parse("2026-11-27T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

// Real shape captured from `opencode stats --models --cost --json` (opencode 2.4.2).
const REAL_MODEL_SAMPLE = {
  model: { id: "deepseek-v4.1-flash", providerID: "opencode-go", variant: "high" },
  steps: 4300,
  tokens: { input: 82985539, output: 1656728, reasoning: 1623138, cache: { read: 1240691200, write: 0 } },
  cost: 18.13782404999993,
};

function statsModel(
  providerID: string,
  id: string,
  variant: string | undefined,
  steps: number,
  input: number,
  output: number,
  cost: number,
) {
  return {
    model: { id, providerID, ...(variant === undefined ? {} : { variant }) },
    steps,
    tokens: { input, output, reasoning: 0, cache: { read: 0, write: 0 } },
    cost,
  };
}

const STATS_MODELS = [
  statsModel("openai", "gpt-4", undefined, 3, 1000, 500, 0.02),
  statsModel("openai", "gpt-5", undefined, 4, 2000, 700, 0.03),
  statsModel("anthropic", "claude-3", undefined, 2, 600, 300, 0),
];

function session(id: string, updated: number, title?: string, directory = "/proj/a", projectId = "p1") {
  return {
    id,
    ...(title === undefined ? {} : { title }),
    updated,
    created: updated - 1000,
    projectId,
    directory,
  };
}

const SESSIONS = [
  session("s1", NOW - 1 * DAY_MS, "Session A"),
  session("s2", NOW - 3 * DAY_MS),
];

function fakeExecFile(
  models: unknown[],
  sessions: unknown[],
  calls: ExecCall[],
): ExecFn {
  return async (file, args, options) => {
    calls.push({ file, args, options });
    if (args[0] === "stats") {
      return { stdout: JSON.stringify({ sessions: 1, models }), stderr: "" };
    }
    if (args[0] === "session" && args[1] === "list") {
      return { stdout: JSON.stringify(sessions), stderr: "" };
    }
    throw new Error(`Unexpected args: ${JSON.stringify(args)}`);
  };
}

function statsCall(calls: ExecCall[]): ExecCall | undefined {
  return calls.find((c) => c.args[0] === "stats");
}

function sessionCall(calls: ExecCall[]): ExecCall | undefined {
  return calls.find((c) => c.args[0] === "session");
}

describe("usageStatsService", () => {
  beforeEach(() => {
    clearUsageStatsCache();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
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

  describe("CLI invocation", () => {
    it("runs opencode stats and session list through execFile with shell:false and no db command", async () => {
      const calls: ExecCall[] = [];
      await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, calls));

      expect(calls).toHaveLength(2);
      for (const call of calls) {
        expect(call.file).toBe("opencode");
        expect(call.args[0]).not.toBe("db");
        expect(call.options.shell).toBe(false);
        expect(call.options.timeout).toBeGreaterThan(0);
        expect(call.options.maxBuffer).toBeGreaterThan(0);
      }
      expect(statsCall(calls)?.args).toEqual(["stats", "--days", "7", "--models", "--cost", "--json"]);
      expect(sessionCall(calls)?.args).toEqual(["session", "list", "--format", "json", "-n", "1000"]);
    });

    it("uses OPENCODE_BIN as the executable for every CLI call when it is set", async () => {
      const bin = "C:\\Program Files\\nodejs\\node_modules\\@opencode\\cli\\bin\\opencode.exe";
      vi.stubEnv("OPENCODE_BIN", bin);
      const calls: ExecCall[] = [];
      await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, calls));

      expect(calls).toHaveLength(2);
      for (const call of calls) {
        expect(call.file).toBe(bin);
        expect(call.options.shell).toBe(false);
      }
    });

    it("trims OPENCODE_BIN and falls back to opencode when it is blank", async () => {
      vi.stubEnv("OPENCODE_BIN", "   ");
      const calls: ExecCall[] = [];
      await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, calls));

      for (const call of calls) {
        expect(call.file).toBe("opencode");
      }
    });

    it("maps days=30 to --days 30", async () => {
      const calls: ExecCall[] = [];
      await collectUsageStats({ days: 30 }, fakeExecFile(STATS_MODELS, SESSIONS, calls));

      expect(statsCall(calls)?.args).toEqual(["stats", "--days", "30", "--models", "--cost", "--json"]);
    });

    it("maps days=0 (all) to --all and never passes --days 0", async () => {
      const calls: ExecCall[] = [];
      await collectUsageStats({ days: 0 }, fakeExecFile(STATS_MODELS, SESSIONS, calls));

      const args = statsCall(calls)?.args ?? [];
      expect(args).toEqual(["stats", "--all", "--models", "--cost", "--json"]);
      expect(args).not.toContain("--days");
    });

    it("does not set a cwd when no project is given", async () => {
      const calls: ExecCall[] = [];
      await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, calls));

      for (const call of calls) {
        expect(call.options.cwd).toBeUndefined();
      }
    });
  });

  describe("provider usage parsing", () => {
    it("parses the real opencode 2.4.2 stats model shape", async () => {
      const calls: ExecCall[] = [];
      const result = await collectUsageStats({ days: 7 }, fakeExecFile([REAL_MODEL_SAMPLE], [], calls));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.providers).toHaveLength(1);
      const provider = result.value.providers[0];
      expect(provider.provider).toBe("opencode-go");
      expect(provider.totalCostUsd).toBeCloseTo(18.13782404999993, 10);
      expect(provider.totalInputTokens).toBe(82985539);
      expect(provider.totalOutputTokens).toBe(1656728);
      expect(provider.totalMessages).toBe(4300);
      expect(provider.sharePercent).toBe(100);
      expect(provider.models[0]).toMatchObject({
        model: "deepseek-v4.1-flash",
        messages: 4300,
        inputTokens: 82985539,
        outputTokens: 1656728,
      });
    });

    it("aggregates models by provider", async () => {
      const result = await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.providers).toHaveLength(2);
      const openai = result.value.providers.find((p) => p.provider === "openai");
      expect(openai?.totalCostUsd).toBe(0.05);
      expect(openai?.totalInputTokens).toBe(3000);
      expect(openai?.totalOutputTokens).toBe(1200);
      expect(openai?.totalMessages).toBe(7);
      expect(openai?.models).toHaveLength(2);
    });

    it("merges variants of the same provider and model id", async () => {
      const models = [
        statsModel("opencode-go", "kimi", "high", 10, 100, 50, 1),
        statsModel("opencode-go", "kimi", "low", 5, 40, 10, 0.5),
        statsModel("opencode-go", "other", undefined, 1, 1, 1, 0.1),
      ];
      const result = await collectUsageStats({ days: 7 }, fakeExecFile(models, [], []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const provider = result.value.providers[0];
      expect(provider.models).toHaveLength(2);
      const kimi = provider.models.find((m) => m.model === "kimi");
      expect(kimi).toEqual({
        model: "kimi",
        costUsd: 1.5,
        inputTokens: 140,
        outputTokens: 60,
        messages: 15,
      });
    });

    it("sorts models and providers by cost descending", async () => {
      const models = [
        statsModel("cheap", "a", undefined, 1, 10, 10, 0.01),
        statsModel("pricey", "b", undefined, 1, 10, 10, 1),
        statsModel("pricey", "c", undefined, 1, 10, 10, 2),
      ];
      const result = await collectUsageStats({ days: 7 }, fakeExecFile(models, [], []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.providers.map((p) => p.provider)).toEqual(["pricey", "cheap"]);
      expect(result.value.providers[0].models.map((m) => m.model)).toEqual(["c", "b"]);
    });

    it("maps zero-cost-with-tokens to null costUsd (cost unavailable)", async () => {
      const result = await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const anthropic = result.value.providers.find((p) => p.provider === "anthropic");
      expect(anthropic?.totalCostUsd).toBeNull();
      expect(anthropic?.models[0].costUsd).toBeNull();
    });

    it("computes sharePercent relative to visible providers by tokens", async () => {
      const result = await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const openai = result.value.providers.find((p) => p.provider === "openai");
      const anthropic = result.value.providers.find((p) => p.provider === "anthropic");
      expect(openai!.sharePercent).toBeGreaterThan(anthropic!.sharePercent);
      expect(openai!.sharePercent + anthropic!.sharePercent).toBe(100);
    });

    it("tolerates a stats payload without a models array", async () => {
      const execFn: ExecFn = async (_file, args) =>
        args[0] === "stats"
          ? { stdout: JSON.stringify({ sessions: 0 }), stderr: "" }
          : { stdout: "[]", stderr: "" };

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.providers).toEqual([]);
    });
  });

  describe("recent sessions", () => {
    it("maps sessions with null per-session usage fields", async () => {
      const result = await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, SESSIONS, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions).toEqual([
        {
          sessionId: "s1",
          title: "Session A",
          projectPath: "/proj/a",
          lastUpdatedAt: new Date(NOW - 1 * DAY_MS).toISOString(),
          messageCount: null,
          totalCostUsd: null,
          totalInputTokens: null,
          totalOutputTokens: null,
          providers: [],
        },
        {
          sessionId: "s2",
          title: null,
          projectPath: "/proj/a",
          lastUpdatedAt: new Date(NOW - 3 * DAY_MS).toISOString(),
          messageCount: null,
          totalCostUsd: null,
          totalInputTokens: null,
          totalOutputTokens: null,
          providers: [],
        },
      ]);
    });

    it("maps a blank title to null", async () => {
      const sessions = [session("s1", NOW, "")];
      const result = await collectUsageStats({ days: 0 }, fakeExecFile([], sessions, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions[0].title).toBeNull();
    });

    it("filters sessions client-side by updated time for days=7", async () => {
      const sessions = [
        session("recent", NOW - 2 * DAY_MS),
        session("edge-out", NOW - 8 * DAY_MS),
        session("old", NOW - 40 * DAY_MS),
      ];
      const result = await collectUsageStats({ days: 7 }, fakeExecFile([], sessions, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions.map((s) => s.sessionId)).toEqual(["recent"]);
      expect(result.value.totalSessions).toBe(1);
    });

    it("filters sessions for days=30", async () => {
      const sessions = [
        session("a", NOW - 8 * DAY_MS),
        session("b", NOW - 29 * DAY_MS),
        session("c", NOW - 31 * DAY_MS),
      ];
      const result = await collectUsageStats({ days: 30 }, fakeExecFile([], sessions, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions.map((s) => s.sessionId)).toEqual(["a", "b"]);
      expect(result.value.totalSessions).toBe(2);
    });

    it("keeps every session when days=0", async () => {
      const sessions = [session("a", NOW - 400 * DAY_MS), session("b", NOW - 1 * DAY_MS)];
      const result = await collectUsageStats({ days: 0 }, fakeExecFile([], sessions, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.totalSessions).toBe(2);
      // Sorted by most recently updated first.
      expect(result.value.recentSessions.map((s) => s.sessionId)).toEqual(["b", "a"]);
    });

    it("caps the displayed list at 5 but reports the full matching count", async () => {
      const sessions = Array.from({ length: 12 }, (_, i) => session(`s${i}`, NOW - i * 1000));
      const result = await collectUsageStats({ days: 7 }, fakeExecFile([], sessions, []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions).toHaveLength(5);
      expect(result.value.totalSessions).toBe(12);
    });

    it("reports totalSessions as 0 when no sessions match", async () => {
      const result = await collectUsageStats({ days: 7 }, fakeExecFile(STATS_MODELS, [], []));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.recentSessions).toHaveLength(0);
      expect(result.value.totalSessions).toBe(0);
    });
  });

  describe("project option", () => {
    const PROJECT_SESSIONS = [session("p-s1", NOW - DAY_MS, "T", "/work/proj", "proj-id-123")];

    it("runs session list in the project cwd and passes the resolved project id to stats", async () => {
      const calls: ExecCall[] = [];
      const result = await collectUsageStats(
        { days: 7, project: "/work/proj" },
        fakeExecFile(STATS_MODELS, PROJECT_SESSIONS, calls),
      );

      expect(result.ok).toBe(true);
      expect(sessionCall(calls)?.options.cwd).toBe("/work/proj");
      expect(statsCall(calls)?.args).toEqual([
        "stats",
        "--days",
        "7",
        "--project",
        "proj-id-123",
        "--models",
        "--cost",
        "--json",
      ]);
    });

    it("keeps shell-metacharacter project values as a literal cwd and never in argv", async () => {
      const dangerous = 'C:\\dev;foo"bar&baz|qux%HOME%`echo`$HOME';
      const calls: ExecCall[] = [];
      await collectUsageStats({ days: 7, project: dangerous }, fakeExecFile(STATS_MODELS, PROJECT_SESSIONS, calls));

      expect(sessionCall(calls)?.options.cwd).toBe(dangerous);
      for (const call of calls) {
        expect(call.options.shell).toBe(false);
        expect(call.args.join(" ")).not.toContain(dangerous);
      }
    });

    it("returns a typed error and does not run stats when the project id cannot be resolved", async () => {
      const calls: ExecCall[] = [];
      const result = await collectUsageStats(
        { days: 7, project: "/no-such-project" },
        fakeExecFile(STATS_MODELS, [], calls),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("NOT_FOUND");
      expect(statsCall(calls)).toBeUndefined();
    });

    it("rejects a project containing a null byte without running the CLI", async () => {
      const calls: ExecCall[] = [];
      const result = await collectUsageStats(
        { days: 7, project: "a\u0000b" },
        fakeExecFile(STATS_MODELS, SESSIONS, calls),
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("SCHEMA_INVALID");
      expect(calls).toHaveLength(0);
    });

    it("rejects an empty project string without running the CLI", async () => {
      const calls: ExecCall[] = [];
      const result = await collectUsageStats({ days: 7, project: "" }, fakeExecFile(STATS_MODELS, SESSIONS, calls));

      expect(result.ok).toBe(false);
      expect(calls).toHaveLength(0);
    });
  });

  describe("metadata and caching", () => {
    it("sets the rangeLabel from the days filter", async () => {
      const execFn = fakeExecFile(STATS_MODELS, SESSIONS, []);

      const all = await collectUsageStats({ days: 0 }, execFn);
      expect(all.ok && all.value.rangeLabel).toBe("all");

      const d7 = await collectUsageStats({ days: 7 }, execFn);
      expect(d7.ok && d7.value.rangeLabel).toBe("7d");

      const d30 = await collectUsageStats({ days: 30 }, execFn);
      expect(d30.ok && d30.value.rangeLabel).toBe("30d");
    });

    it("serves cached results within the TTL without re-invoking the CLI", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(STATS_MODELS, SESSIONS, calls);

      await collectUsageStats({ days: 7 }, execFn);
      await collectUsageStats({ days: 7 }, execFn);

      expect(calls).toHaveLength(2);
    });

    it("uses a distinct cache entry per days:project key", async () => {
      const calls: ExecCall[] = [];
      const execFn = fakeExecFile(STATS_MODELS, SESSIONS, calls);

      await collectUsageStats({ days: 7 }, execFn);
      await collectUsageStats({ days: 30 }, execFn);

      expect(calls).toHaveLength(4);
    });
  });

  describe("error mapping", () => {
    it("returns FILE_MISSING when the CLI is unavailable (ENOENT)", async () => {
      const execFn: ExecFn = async () => {
        const error = new Error("spawn opencode ENOENT") as Error & { code?: string };
        error.code = "ENOENT";
        throw error;
      };

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("FILE_MISSING");
    });

    it("returns FILE_MISSING when the CLI exceeds the timeout", async () => {
      const execFn: ExecFn = async () => {
        const error = new Error("Command timed out") as Error & { code?: string };
        error.code = "ETIMEDOUT";
        throw error;
      };

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("FILE_MISSING");
    });

    it("returns PARSE_FAILED when CLI output is not valid JSON", async () => {
      const execFn: ExecFn = async () => ({ stdout: "not json", stderr: "" });

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PARSE_FAILED");
    });

    it("returns PARSE_FAILED when the session list is not an array", async () => {
      const execFn: ExecFn = async (_file, args) =>
        args[0] === "stats"
          ? { stdout: JSON.stringify({ models: [] }), stderr: "" }
          : { stdout: JSON.stringify({ not: "an array" }), stderr: "" };

      const result = await collectUsageStats({ days: 7 }, execFn);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("PARSE_FAILED");
    });
  });
});

export type { DaysFilter, UsageStatsOptions };
