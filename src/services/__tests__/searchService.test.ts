import { describe, expect, it } from "vitest";
import type { OpenCodeConfig } from "@/types";
import {
  sanitizeQuery,
  scoreMatch,
  searchEntities,
  tokenize,
} from "@/services/searchService";

const config: OpenCodeConfig = {
  default_agent: "sdd-orchestrator-review",
  agent: {
    claude: {
      description: "Claude planning agent",
      mode: "primary",
      model: "anthropic/claude-sonnet",
      variant: "high",
      prompt: "secret prompt",
      tools: { shell: true },
      permission: { edit: true },
    },
    "sdd-orchestrator-review": {
      model: "openai/gpt-5.5",
      variant: "medium",
    },
  },
  mcp: { secret: true },
  permission: { write: true },
  plugin: [{ name: "secret" }],
  share: "private",
  theme: "dark",
};

describe("search query utilities", () => {
  it("trims, removes control characters, and caps queries at 200 characters", () => {
    const sanitized = sanitizeQuery(`  claude\u0000\t${"x".repeat(250)}  `);

    expect(sanitized).toHaveLength(200);
    expect(sanitized).toBe(`claudex${"x".repeat(193)}`);
  });

  it("keeps only searchable tokens with at least two characters", () => {
    expect(tokenize("a claude  x gpt-5")).toEqual(["claude", "gpt-5"]);
  });

  it("scores exact, prefix, partial, and missing matches predictably", () => {
    expect(scoreMatch("claude", "claude")).toBe(100);
    expect(scoreMatch("claude", "claude-sonnet")).toBe(75);
    expect(scoreMatch("sonnet", "claude-sonnet")).toBe(50);
    expect(scoreMatch("opus", "claude-sonnet")).toBe(0);
  });
});

describe("searchEntities", () => {
  it("aggregates agents, models, profiles, backups, and config without sensitive fields", async () => {
    const response = await searchEntities({
      query: "claude",
      readConfig: async () => ({ ok: true, value: config }),
      readModelCache: async () => ({ ok: true, value: { anthropic: { "claude-sonnet": ["high"] } } }),
      listBackups: async () => [{
        id: "backup-1",
        source: "C:\\Users\\Ada\\project-claude",
        timestamp: "2026-08-13T10:00:00.000Z",
        fileCount: 3,
        size: 2048,
        pinned: true,
      }],
    });

    expect(response.query).toBe("claude");
    expect(response.results.map((result) => result.type)).toEqual([
      "agent",
      "model",
      "backup",
    ]);
    expect(response.results[0]).toMatchObject({
      type: "agent",
      id: "claude",
      label: "claude",
      subtitle: "anthropic/claude-sonnet",
      href: "/models?agent=claude",
    });
    expect(JSON.stringify(response)).not.toMatch(/prompt|tools|permission|mcp|plugin|share|C:\\Users/);
    expect(JSON.stringify(response)).toContain("project-claude");
  });

  it("returns partial results and warnings when a source is unavailable", async () => {
    const response = await searchEntities({
      query: "dark",
      readConfig: async () => ({ ok: true, value: config }),
      readModelCache: async () => ({
        ok: false,
        error: { code: "FILE_MISSING", message: "missing cache" },
      }),
      listBackups: async () => [],
    });

    expect(response.results).toEqual([
      expect.objectContaining({ type: "config", id: "theme", label: "Theme" }),
    ]);
    expect(response.warnings).toEqual(["models"]);
  });

  it("returns an empty response for an empty or one-character query", async () => {
    const response = await searchEntities({
      query: " a ",
      readConfig: async () => ({ ok: true, value: config }),
      readModelCache: async () => ({ ok: true, value: {} }),
      listBackups: async () => [],
    });

    expect(response).toEqual({ results: [], total: 0, query: "a" });
  });
});
