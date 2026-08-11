import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readModelCache,
  listProviders,
  listModelsForProvider,
  getEffortsForModel,
} from "@/services/modelCacheService";

describe("readModelCache", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-cache-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("reads model-variants.json and returns the cache", async () => {
    await writeFile(
      join(tempDir, "model-variants.json"),
      JSON.stringify({
        "opencode-go": {
          "qwen3.8-max": ["high", "max"],
          "kimi-k2.7-code": ["high", "low", "medium"],
        },
        anthropic: {
          "claude-sonnet-4-6": ["high", "low", "max", "medium"],
        },
      }),
    );

    const cache = await readModelCache(tempDir);

    expect(listProviders(cache)).toEqual(["opencode-go", "anthropic"]);
    expect(listModelsForProvider(cache, "opencode-go")).toEqual([
      "qwen3.8-max",
      "kimi-k2.7-code",
    ]);
    expect(getEffortsForModel(cache, "opencode-go", "qwen3.8-max")).toEqual([
      "high",
      "max",
    ]);
  });

  it("throws when model-variants.json does not exist", async () => {
    await expect(readModelCache(tempDir)).rejects.toThrow();
  });
});
