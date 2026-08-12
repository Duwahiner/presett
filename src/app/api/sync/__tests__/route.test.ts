import { describe, it, expect } from "vitest";
import { POST } from "../route";

describe("POST /api/sync", () => {
  it("returns error when gentle-ai is missing", async () => {
    process.env.PRESETT_TEST_SYNC_COMMAND = "missing-command-xyz";
    const response = await POST();
    delete process.env.PRESETT_TEST_SYNC_COMMAND;

    expect(response.status).toBe(503);
  });
});
