import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { syncStatePath } from "@/lib/paths";

describe("syncStatePath", () => {
  it("joins the presett directory with sync-state.json", () => {
    expect(syncStatePath({ presettDir: "/data/presett" })).toBe(
      join("/data/presett", "sync-state.json"),
    );
  });
});