import { describe, it, expect } from "vitest";
import {
  openCodeConfigSchema,
  validateModelAssignment,
  buildModelCache,
  type ModelCache,
} from "@/lib/validators";
import type { OpenCodeConfig } from "@/types";

describe("openCodeConfigSchema", () => {
  it("accepts a minimal valid config", () => {
    const config: OpenCodeConfig = {
      $schema: "https://opencode.ai/config.json",
      default_agent: "gentle-orchestrator",
      agent: {
        "gentle-orchestrator": {
          model: "opencode-go/qwen3.8-max",
          variant: "medium",
        },
      },
    };

    const result = openCodeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects a config without the agent map", () => {
    const result = openCodeConfigSchema.safeParse({ default_agent: "x" });
    expect(result.success).toBe(false);
  });

  it("preserves unknown top-level keys", () => {
    const config = {
      agent: {},
      unknown_key: { nested: true },
    };

    const result = openCodeConfigSchema.parse(config);
    expect(result.unknown_key).toEqual({ nested: true });
  });
});

describe("buildModelCache", () => {
  it("indexes provider → model → variants", () => {
    const raw: ModelCache = {
      openai: {
        "gpt-4": ["low", "medium", "high"],
      },
    };

    const cache = buildModelCache(raw);

    expect(cache.getVariants("openai", "gpt-4")).toEqual([
      "low",
      "medium",
      "high",
    ]);
    expect(cache.hasProvider("openai")).toBe(true);
    expect(cache.hasModel("openai", "gpt-4")).toBe(true);
  });
});

describe("validateModelAssignment", () => {
  const raw: ModelCache = {
    openai: { "gpt-4": ["low", "high"] },
  };
  const cache = buildModelCache(raw);

  it("returns ok for a valid provider/model/variant", () => {
    const result = validateModelAssignment(cache, {
      provider: "openai",
      model: "gpt-4",
      variant: "low",
    });

    expect(result.ok).toBe(true);
  });

  it("returns error for an unknown provider", () => {
    const result = validateModelAssignment(cache, {
      provider: "unknown",
      model: "gpt-4",
      variant: "low",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
  });

  it("returns error for an unknown variant", () => {
    const result = validateModelAssignment(cache, {
      provider: "openai",
      model: "gpt-4",
      variant: "extra",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
  });

  it("returns WRITE_BLOCKED when cache is empty", () => {
    const result = validateModelAssignment(buildModelCache({}), {
      provider: "openai",
      model: "gpt-4",
      variant: "low",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("WRITE_BLOCKED");
  });
});
