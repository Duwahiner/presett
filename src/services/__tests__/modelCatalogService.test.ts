import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseVerboseOpencodeModelsOutput,
  parsePlainOpencodeModelsOutput,
  readLiveOpencodeModelCatalogSafe,
  loadMergedModelCatalogSafe,
  clearServerModelCatalogCache,
} from "@/services/modelCatalogService";

const execMock = vi.hoisted(() => ({ exec: vi.fn() }));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    exec: execMock.exec,
    default: { ...actual, exec: execMock.exec },
  };
});

type ExecCallback = (err: unknown, result?: { stdout?: string; stderr?: string }) => void;

/**
 * Route each `exec` call by its command string. A handler returning a string is a
 * success (stdout); a handler returning an Error-like object is a failure.
 */
function mockExecByCommand(handlers: Record<string, () => string | Error>): void {
  execMock.exec.mockImplementation((cmd: string, _opts: unknown, cb: ExecCallback) => {
    const handler = handlers[cmd];
    if (!handler) return cb({ code: 1, message: `unexpected command: ${cmd}` });
    const outcome = handler();
    if (outcome instanceof Error) return cb(outcome);
    cb(null, { stdout: outcome, stderr: "" });
  });
}

describe("parsePlainOpencodeModelsOutput", () => {
  it("builds catalog entries from provider/model ids with empty variants", () => {
    const output = "anthropic/claude-sonnet-4\r\nopenai/gpt-5\r\n\r\n";

    expect(parsePlainOpencodeModelsOutput(output)).toEqual({
      anthropic: { "claude-sonnet-4": [] },
      openai: { "gpt-5": [] },
    });
  });

  it("splits on the first slash only and ignores blank or malformed lines", () => {
    const output = [
      "",
      "   ",
      "openrouter/anthropic/claude-3.5",
      "no-separator",
      "/missing-provider",
      "missing-model/",
      "opencode/qwen3-max",
    ].join("\n");

    expect(parsePlainOpencodeModelsOutput(output)).toEqual({
      openrouter: { "anthropic/claude-3.5": [] },
      opencode: { "qwen3-max": [] },
    });
  });
});

describe("readLiveOpencodeModelCatalogSafe command selection", () => {
  const VERBOSE = "opencode models --verbose";
  const PLAIN = "opencode models";

  beforeEach(() => {
    execMock.exec.mockReset();
    vi.stubEnv("PRESETT_TEST_OPENCODE_MODELS_FILE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the verbose output when `--verbose` succeeds and does not run the plain command", async () => {
    const verbose = [
      "opencode/qwen3-max",
      "{",
      '  "id": "qwen3-max",',
      '  "providerID": "opencode",',
      '  "variants": { "high": {}, "max": {} }',
      "}",
    ].join("\n");
    mockExecByCommand({ [VERBOSE]: () => verbose, [PLAIN]: () => "should/not-run" });

    const result = await readLiveOpencodeModelCatalogSafe();

    expect(result).toEqual({ ok: true, value: { opencode: { "qwen3-max": ["high", "max"] } } });
    expect(execMock.exec.mock.calls.map((c) => c[0])).toEqual([VERBOSE]);
  });

  it("falls back to plain `opencode models` ids when `--verbose` is rejected", async () => {
    mockExecByCommand({
      [VERBOSE]: () =>
        Object.assign(new Error("Unrecognized flag: --verbose in command opencode models"), { code: 1 }),
      [PLAIN]: () => "anthropic/claude-sonnet-4\r\nopenai/gpt-5\r\n",
    });

    const result = await readLiveOpencodeModelCatalogSafe();

    expect(result).toEqual({
      ok: true,
      value: { anthropic: { "claude-sonnet-4": [] }, openai: { "gpt-5": [] } },
    });
    expect(execMock.exec.mock.calls.map((c) => c[0])).toEqual([VERBOSE, PLAIN]);
  });

  it("returns FILE_MISSING when both verbose and plain commands fail", async () => {
    mockExecByCommand({
      [VERBOSE]: () => Object.assign(new Error("verbose failed"), { code: 1 }),
      [PLAIN]: () => Object.assign(new Error("plain failed"), { code: 1 }),
    });

    const result = await readLiveOpencodeModelCatalogSafe();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FILE_MISSING");
  });

  it("still loads the merged catalog from cache when both live commands fail", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "presett-cat-live-"));
    const configDir = await mkdtemp(join(tmpdir(), "presett-cat-live-config-"));
    const gentleAiDir = await mkdtemp(join(tmpdir(), "presett-cat-live-gentle-"));
    try {
      clearServerModelCatalogCache();
      await writeFile(join(cacheDir, "model-variants.json"), JSON.stringify({ openai: { "gpt-5": ["high"] } }));
      mockExecByCommand({
        [VERBOSE]: () => Object.assign(new Error("nope"), { code: 1 }),
        [PLAIN]: () => Object.assign(new Error("nope"), { code: 1 }),
      });

      const result = await loadMergedModelCatalogSafe({ cacheDir, openCodeConfigDir: configDir, gentleAiDir });

      expect(result).toEqual({ ok: true, value: { openai: { "gpt-5": ["high"] } } });
    } finally {
      clearServerModelCatalogCache();
      await rm(cacheDir, { recursive: true, force: true });
      await rm(configDir, { recursive: true, force: true });
      await rm(gentleAiDir, { recursive: true, force: true });
    }
  });
});

describe("parseVerboseOpencodeModelsOutput", () => {
  it("ingests a raw `opencode` providerID verbatim", () => {
    const output = [
      "opencode/qwen3-max",
      "{",
      '  "id": "qwen3-max",',
      '  "providerID": "opencode",',
      '  "variants": { "high": {}, "max": {} }',
      "}",
    ].join("\n");

    const catalog = parseVerboseOpencodeModelsOutput(output);

    expect(catalog["opencode"]).toBeDefined();
    expect(catalog["opencode"]["qwen3-max"]).toEqual(["high", "max"]);
    expect(catalog["opencode-zen"]).toBeUndefined();
  });

  it("keeps providerIDs verbatim without introducing `opencode-zen`", () => {
    const output = [
      "openai/gpt-4",
      "{",
      '  "id": "gpt-4",',
      '  "providerID": "openai",',
      '  "variants": { "low": {} }',
      "}",
      "opencode/qwen3-max",
      "{",
      '  "id": "qwen3-max",',
      '  "providerID": "opencode",',
      '  "variants": { "high": {} }',
      "}",
    ].join("\n");

    const catalog = parseVerboseOpencodeModelsOutput(output);

    expect(catalog.openai["gpt-4"]).toEqual(["low"]);
    expect(catalog["opencode"]["qwen3-max"]).toEqual(["high"]);
  });
});

describe("loadMergedModelCatalogSafe", () => {
  let tempDir = "";
  let configDir = "";
  let gentleAiDir = "";
  let verboseFile = "";

  beforeEach(async () => {
    clearServerModelCatalogCache();
    tempDir = await mkdtemp(join(tmpdir(), "presett-cat-"));
    configDir = await mkdtemp(join(tmpdir(), "presett-cat-config-"));
    gentleAiDir = await mkdtemp(join(tmpdir(), "presett-cat-gentle-"));
    verboseFile = join(tempDir, "opencode-models-verbose.txt");
    vi.stubEnv("PRESETT_TEST_MODEL_CACHE_DIR", tempDir);
    vi.stubEnv("PRESETT_TEST_CONFIG_DIR", configDir);
    vi.stubEnv("PRESETT_TEST_GENTLE_AI_DIR", gentleAiDir);
    vi.stubEnv("PRESETT_TEST_OPENCODE_MODELS_FILE", verboseFile);
    await writeFile(verboseFile, "");
  });

  afterEach(async () => {
    clearServerModelCatalogCache();
    vi.unstubAllEnvs();
    await rm(tempDir, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
    await rm(gentleAiDir, { recursive: true, force: true });
  });

  it("preserves a raw `opencode` cache key without on-read migration", async () => {
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({ opencode: { "qwen3-max": ["high"] } }),
    );

    const result = await loadMergedModelCatalogSafe({
      cacheDir: tempDir,
      openCodeConfigDir: configDir,
      gentleAiDir,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value["opencode"]).toEqual({ "qwen3-max": ["high"] });
    expect(result.value["opencode-zen"]).toBeUndefined();
  });
});