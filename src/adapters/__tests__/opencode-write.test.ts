import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectOpenCode,
  readOpenCodeConfig,
  writeOpenCodeConfig,
  listModelAssignments,
  updateModelAssignment,
} from "@/adapters/opencode";
import type { ModelCache } from "@/lib/validators";
import type { OpenCodeConfig } from "@/types";

describe("writeOpenCodeConfig", () => {
  let tempDir = "";
  let backupDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-opencode-"));
    backupDir = join(tempDir, "backups");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("writes a valid config atomically and creates a backup", async () => {
    const configPath = join(tempDir, "opencode.json");
    await writeFile(configPath, JSON.stringify({ agent: {} }));

    const result = await writeOpenCodeConfig(
      tempDir,
      { agent: { "sdd-init": { model: "x/y", variant: "low" } } },
      backupDir,
    );

    expect(result.ok).toBe(true);
    const written = await readFile(configPath, "utf-8");
    expect(JSON.parse(written).agent["sdd-init"].model).toBe("x/y");

    const backups = await readdir(backupDir);
    expect(backups.length).toBe(1);
  });

  it("refuses to write a jsonc file", async () => {
    const configPath = join(tempDir, "opencode.jsonc");
    await writeFile(configPath, "{}");

    const result = await writeOpenCodeConfig(
      tempDir,
      { agent: {} },
      backupDir,
      "opencode.jsonc",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("JSONC_NOT_SUPPORTED");
  });

  it("preserves unknown keys", async () => {
    const configPath = join(tempDir, "opencode.json");
    await writeFile(
      configPath,
      JSON.stringify({ agent: {}, custom_key: [1, 2, 3] }),
    );

    const result = await writeOpenCodeConfig(
      tempDir,
      { agent: {}, custom_key: [1, 2, 3] } as unknown as OpenCodeConfig,
      backupDir,
    );

    expect(result.ok).toBe(true);
    const written = JSON.parse(await readFile(configPath, "utf-8"));
    expect(written.custom_key).toEqual([1, 2, 3]);
  });
});

describe("listModelAssignments", () => {
  it("returns assignments with provider/model/variant", () => {
    const config = {
      agent: {
        "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        "sdd-init": { model: "google/gemini-2.5", variant: "medium" },
      },
    };

    const list = listModelAssignments(config);

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      agentKey: "gentle-orchestrator",
      provider: "openai",
      model: "gpt-4",
      variant: "low",
    });
  });
});

describe("updateModelAssignment", () => {
  const cache: ModelCache = {
    openai: { "gpt-4": ["low", "high"] },
  };

  it("updates an existing agent entry", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "presett-opencode-"));
    const backupDir = join(tempDir, "backups");
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "sdd-init": { model: "x/y", variant: "low" } },
      }),
    );

    const result = await updateModelAssignment(
      tempDir,
      "sdd-init",
      { provider: "openai", model: "gpt-4", variant: "high" },
      backupDir,
      cache,
    );

    expect(result.ok).toBe(true);
    const config = await readOpenCodeConfig(tempDir);
    expect(config.agent["sdd-init"]).toMatchObject({
      model: "openai/gpt-4",
      variant: "high",
    });

    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns error for invalid model/variant", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "presett-opencode-"));
    const backupDir = join(tempDir, "backups");
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: {} }),
    );

    const result = await updateModelAssignment(
      tempDir,
      "sdd-init",
      { provider: "unknown", model: "gpt-4", variant: "low" },
      backupDir,
      cache,
    );

    expect(result.ok).toBe(false);
    await rm(tempDir, { recursive: true, force: true });
  });
});
