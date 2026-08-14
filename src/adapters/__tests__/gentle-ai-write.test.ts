import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeGentleAiConfig } from "@/adapters/gentle-ai";

describe("writeGentleAiConfig", () => {
  it("writes state atomically and preserves a backup", async () => {
    const dir = await mkdtemp(join(tmpdir(), "presett-gentle-"));
    const backup = join(dir, "backups");
    await mkdir(backup);
    await writeGentleAiConfig(dir, { persona: "builder", language: "es" }, backup);
    expect(JSON.parse(await readFile(join(dir, "state.json"), "utf8"))).toMatchObject({ persona: "builder", language: "es" });
  });
});
