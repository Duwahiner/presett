import { describe, it, expect } from "vitest";
import { runGentleAiSync } from "@/services/processService";

describe("runGentleAiSync", () => {
  it("returns error when gentle-ai is not installed", async () => {
    const result = await runGentleAiSync("non-existent-binary-xyz");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("FILE_MISSING");
  });
});
