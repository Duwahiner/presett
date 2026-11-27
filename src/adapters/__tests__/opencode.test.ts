import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseOpenCodeConfig,
  detectOpenCode,
  readOpenCodeConfig,
  readOpenCodeConfigSafe,
  mergeOpenCodeConfigs,
} from "@/adapters/opencode";

describe("parseOpenCodeConfig", () => {
  it("returns a parsed config with default agent and agents map", () => {
    const raw = JSON.stringify({
      $schema: "https://opencode.ai/config.json",
      default_agent: "gentle-orchestrator",
      agent: {
        "gentle-orchestrator": {
          model: "opencode-go/qwen3.8-max",
          variant: "medium",
        },
        "sdd-init": {
          model: "google/gemini-2.5-flash-lite",
          variant: "medium",
        },
      },
      theme: "system",
    });

    const config = parseOpenCodeConfig(raw);

    expect(config.default_agent).toBe("gentle-orchestrator");
    expect(config.agent["gentle-orchestrator"].model).toBe(
      "opencode-go/qwen3.8-max",
    );
    expect(config.agent["sdd-init"].model).toBe("google/gemini-2.5-flash-lite");
    expect(config.theme).toBe("system");
  });

  it("throws when JSON is invalid", () => {
    expect(() => parseOpenCodeConfig("not-json")).toThrow();
  });
});

describe("detectOpenCode", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-opencode-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reports installed when opencode.json exists", async () => {
    await writeFile(join(tempDir, "opencode.json"), "{}");

    const result = await detectOpenCode(tempDir);

    expect(result.installed).toBe(true);
    expect(result.agentId).toBe("opencode");
    expect(result.configPath).toBe(tempDir);
  });

  it("reports not installed when opencode.json is missing", async () => {
    const result = await detectOpenCode(tempDir);

    expect(result.installed).toBe(false);
    expect(result.agentId).toBe("opencode");
  });
});

describe("readOpenCodeConfig", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-opencode-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reads and parses opencode.json from the config directory", async () => {
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: {
          "gentle-orchestrator": { model: "opencode-go/qwen3.8-max" },
        },
      }),
    );

    const config = await readOpenCodeConfig(tempDir);

    expect(config.default_agent).toBe("gentle-orchestrator");
    expect(config.agent["gentle-orchestrator"].model).toBe(
      "opencode-go/qwen3.8-max",
    );
  });

  it("throws when opencode.json does not exist", async () => {
    await expect(readOpenCodeConfig(tempDir)).rejects.toThrow();
  });
});

describe("readOpenCodeConfigSafe — opencode.jsonc + opencode.json coexistence", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-opencode-merge-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("merges a Base-only jsonc with a generated-multi profile present only in json", async () => {
    await writeFile(
      join(tempDir, "opencode.jsonc"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        theme: "system",
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        },
      }),
    );

    const result = await readOpenCodeConfigSafe(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Base agents and base scalar fields come from jsonc (authoritative base).
    expect(result.value.agent["gentle-orchestrator"]).toEqual({
      model: "openai/gpt-4",
      variant: "low",
    });
    expect(result.value.default_agent).toBe("gentle-orchestrator");
    expect(result.value.theme).toBe("system");
    // The generated-multi profile present only in json is also surfaced.
    expect(result.value.agent["sdd-orchestrator-custom"]).toEqual({
      model: "openai/gpt-4",
      variant: "high",
    });
  });

  it("applies deterministic precedence: jsonc wins for an agent key present in both files", async () => {
    await writeFile(
      join(tempDir, "opencode.jsonc"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "anthropic/claude-4", variant: "high" },
        },
      }),
    );

    const result = await readOpenCodeConfigSafe(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.agent["gentle-orchestrator"]).toEqual({
      model: "openai/gpt-4",
      variant: "low",
    });
  });

  it("returns the jsonc base alone when only opencode.jsonc exists", async () => {
    await writeFile(
      join(tempDir, "opencode.jsonc"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: { "gentle-orchestrator": { model: "openai/gpt-4" } },
      }),
    );

    const result = await readOpenCodeConfigSafe(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.agent["gentle-orchestrator"]).toEqual({
      model: "openai/gpt-4",
    });
    expect(result.value.agent).toEqual({
      "gentle-orchestrator": { model: "openai/gpt-4" },
    });
  });

  it("returns the json file alone when only opencode.json exists", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "sdd-orchestrator-custom",
        agent: {
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        },
      }),
    );

    const result = await readOpenCodeConfigSafe(tempDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.default_agent).toBe("sdd-orchestrator-custom");
    expect(result.value.agent["sdd-orchestrator-custom"]).toEqual({
      model: "openai/gpt-4",
      variant: "high",
    });
  });

  it("returns FILE_MISSING when neither file exists", async () => {
    const result = await readOpenCodeConfigSafe(tempDir);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FILE_MISSING");
  });
});

describe("mergeOpenCodeConfigs", () => {
  it("keeps the base (jsonc) config as authoritative and adds extra agents", () => {
    const merged = mergeOpenCodeConfigs(
      {
        default_agent: "gentle-orchestrator",
        agent: { "gentle-orchestrator": { model: "openai/gpt-4" } },
      },
      {
        agent: { "sdd-orchestrator-custom": { model: "openai/gpt-4" } },
      },
    );

    expect(merged.agent).toEqual({
      "gentle-orchestrator": { model: "openai/gpt-4" },
      "sdd-orchestrator-custom": { model: "openai/gpt-4" },
    });
    expect(merged.default_agent).toBe("gentle-orchestrator");
  });

  it("wins for the base on duplicate agent keys (deterministic precedence)", () => {
    const merged = mergeOpenCodeConfigs(
      { agent: { key: { model: "openai/gpt-4", variant: "low" } } },
      { agent: { key: { model: "anthropic/claude-4", variant: "high" } } },
    );

    expect(merged.agent.key).toEqual({ model: "openai/gpt-4", variant: "low" });
  });
});
