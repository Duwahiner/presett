import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseOpenCodeConfig,
  detectOpenCode,
  readOpenCodeConfig,
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
