import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readStateJson,
  getInstalledAgents,
  getSddMode,
} from "@/services/stateService";

describe("readStateJson", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-state-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reads and parses state.json", async () => {
    await writeFile(
      join(tempDir, "state.json"),
      JSON.stringify({
        installed_agents: ["opencode", "claude-code"],
        selection_configured: true,
        components: ["engram", "sdd"],
        preset: "full-gentleman",
        sdd_mode: "multi",
        strict_tdd: true,
        community_tools: ["codegraph"],
        community_tools_configured: true,
        claude_phase_assignments: {},
        codexModelAssignments: {},
        codexOrchestratorAssignment: { model: "gpt-5.6-sol", effort: "medium" },
        codexCarrilModelAssignments: {},
        model_assignments: {
          "gentle-orchestrator": {
            provider_id: "opencode-go",
            model_id: "qwen3.8-max",
            effort: "medium",
          },
        },
        persona: "gentleman",
      }),
    );

    const state = await readStateJson(tempDir);

    expect(state.installed_agents).toContain("opencode");
    expect(state.sdd_mode).toBe("multi");
    expect(state.model_assignments["gentle-orchestrator"].model_id).toBe(
      "qwen3.8-max",
    );
  });

  it("throws when state.json does not exist", async () => {
    await expect(readStateJson(tempDir)).rejects.toThrow();
  });
});

describe("getInstalledAgents", () => {
  it("returns the installed agents from a state object", () => {
    const state = {
      installed_agents: ["opencode", "codex"],
      sdd_mode: "single",
      model_assignments: {},
    } as const;

    expect(getInstalledAgents(state as never)).toEqual(["opencode", "codex"]);
  });
});

describe("getSddMode", () => {
  it("returns the SDD mode from a state object", () => {
    const state = {
      installed_agents: [],
      sdd_mode: "multi",
      model_assignments: {},
    } as const;

    expect(getSddMode(state as never)).toBe("multi");
  });
});
