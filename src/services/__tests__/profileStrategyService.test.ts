import { describe, it, expect } from "vitest";
import type { OpenCodeConfig } from "@/types/opencode";
import {
  detectProfileStrategy,
  detectIncompleteProfiles,
  guardProfileMutation,
  isOrchestratorProfileKey,
  isPhaseAgentKey,
  isReservedProfileName,
} from "@/services/profileStrategyService";

function config(agent: Record<string, unknown>): OpenCodeConfig {
  return { agent: agent as OpenCodeConfig["agent"] };
}

describe("detectProfileStrategy", () => {
  it("returns generated-multi when gentle-orchestrator and at least one generated profile exist", () => {
    const strategy = detectProfileStrategy(
      config({
        "gentle-orchestrator": { mode: "primary" },
        "sdd-orchestrator-cheap": { model: "openai/gpt-4" },
      }),
    );

    expect(strategy).toBe("generated-multi");
  });

  it("returns external-single-active when a primary agent is not managed by Gentle-AI", () => {
    const strategy = detectProfileStrategy(
      config({
        "external-work": { mode: "primary", model: "openai/gpt-4" },
      }),
    );

    expect(strategy).toBe("external-single-active");
  });

  it("prioritizes external-single-active over generated-multi when an external primary profile exists", () => {
    const strategy = detectProfileStrategy(
      config({
        "gentle-orchestrator": { mode: "primary" },
        "external-work": { mode: "primary", model: "openai/gpt-4" },
      }),
    );

    expect(strategy).toBe("external-single-active");
  });

  it("returns unknown when there is no reliable signal", () => {
    expect(detectProfileStrategy(config({}))).toBe("unknown");
  });

  it("returns unknown for an install with only non-profile subagents", () => {
    const strategy = detectProfileStrategy(
      config({ "review-risk": { mode: "subagent", model: "openai/gpt-4" } }),
    );

    expect(strategy).toBe("unknown");
  });

  it("returns generated-multi for a fresh install with only the Base orchestrator and no named profiles", () => {
    const strategy = detectProfileStrategy(
      config({ "gentle-orchestrator": { mode: "primary" } }),
    );

    expect(strategy).toBe("generated-multi");
  });

  it("returns generated-multi when only a generated profile exists without the Base orchestrator", () => {
    const strategy = detectProfileStrategy(
      config({ "sdd-orchestrator-cheap": { model: "openai/gpt-4" } }),
    );

    expect(strategy).toBe("generated-multi");
  });

  it("returns generated-multi even when an unrelated subagent is present", () => {
    const strategy = detectProfileStrategy(
      config({
        "gentle-orchestrator": { mode: "primary" },
        "sdd-orchestrator-cheap": { model: "openai/gpt-4" },
        "sdd-init": { mode: "subagent", model: "openai/gpt-4" },
      }),
    );

    expect(strategy).toBe("generated-multi");
  });
});

describe("detectIncompleteProfiles", () => {
  it("marks a generated profile missing any of its ten phase agents as incomplete", () => {
    const incomplete = detectIncompleteProfiles(
      config({
        "gentle-orchestrator": { mode: "primary" },
        "sdd-orchestrator-cheap": { model: "openai/gpt-4" },
      }),
    );

    expect(incomplete).toEqual(["cheap"]);
  });

  it("does not mark a generated profile that has all ten phase agents", () => {
    const agent: Record<string, unknown> = {
      "gentle-orchestrator": { mode: "primary" },
      "sdd-orchestrator-cheap": { model: "openai/gpt-4" },
    };
    const phases = [
      "init",
      "propose",
      "spec",
      "design",
      "tasks",
      "apply",
      "verify",
      "archive",
      "explore",
      "onboard",
    ];
    for (const phase of phases) {
      agent[`sdd-${phase}-cheap`] = { mode: "subagent", model: "openai/gpt-4" };
    }

    expect(detectIncompleteProfiles(config(agent))).toEqual([]);
  });

  it("returns an empty list when there are no generated profiles", () => {
    const incomplete = detectIncompleteProfiles(
      config({ "gentle-orchestrator": { mode: "primary" } }),
    );

    expect(incomplete).toEqual([]);
  });

  it("excludes the empty-name base identity from incompleteness", () => {
    const incomplete = detectIncompleteProfiles(
      config({ "gentle-orchestrator": { mode: "primary" } }),
    );

    expect(incomplete).not.toContain("");
  });
});

describe("guardProfileMutation", () => {
  it("blocks mutations on external-single-active with STRATEGY_READONLY", () => {
    const guard = guardProfileMutation("external-single-active");

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.code).toBe("STRATEGY_READONLY");
    }
  });

  it("blocks mutations on unknown strategy with STRATEGY_READONLY", () => {
    const guard = guardProfileMutation("unknown");

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.code).toBe("STRATEGY_READONLY");
    }
  });

  it("allows mutations on generated-multi", () => {
    expect(guardProfileMutation("generated-multi")).toEqual({ ok: true });
  });
});

describe("agent key helpers", () => {
  it("recognizes generated orchestrator profile keys", () => {
    expect(isOrchestratorProfileKey("sdd-orchestrator-cheap")).toBe(true);
    expect(isOrchestratorProfileKey("gentle-orchestrator")).toBe(false);
    expect(isOrchestratorProfileKey("sdd-orchestrator-")).toBe(false);
  });

  it("recognizes generated phase agent keys for known phases only", () => {
    expect(isPhaseAgentKey("sdd-init-cheap")).toBe(true);
    expect(isPhaseAgentKey("sdd-apply-cheap")).toBe(true);
    expect(isPhaseAgentKey("sdd-init")).toBe(false);
    expect(isPhaseAgentKey("sdd-unknownphase-cheap")).toBe(false);
  });
});

describe("isReservedProfileName", () => {
  it("marks the literal name 'base' as reserved", () => {
    expect(isReservedProfileName("base")).toBe(true);
  });

  it("marks any name starting with the internal orchestrator prefix as reserved", () => {
    expect(isReservedProfileName("sdd-orchestrator-free")).toBe(true);
    expect(isReservedProfileName("sdd-orchestrator")).toBe(true);
  });

  it("does not mark a plain name as reserved, even one containing the prefix word later", () => {
    expect(isReservedProfileName("orchestrator-free")).toBe(false);
    expect(isReservedProfileName("free-orchestrator")).toBe(false);
    expect(isReservedProfileName("work")).toBe(false);
  });
});