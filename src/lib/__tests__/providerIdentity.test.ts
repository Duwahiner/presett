import { describe, it, expect } from "vitest";
import {
  resolveProviderLabel,
  PROVIDER_DISPLAY_NAMES,
} from "@/lib/providerIdentity";

describe("PROVIDER_DISPLAY_NAMES", () => {
  it("keys the OpenCode product label by the canonical `opencode` id", () => {
    expect(PROVIDER_DISPLAY_NAMES["opencode"]).toBe("OpenCode");
  });
});

describe("resolveProviderLabel", () => {
  it("returns the auth label when the catalog id is connected", () => {
    expect(resolveProviderLabel("opencode", true)).toBe("OpenCode Zen");
  });

  it("returns the base label when the catalog id is not connected", () => {
    expect(resolveProviderLabel("opencode", false)).toBe("OpenCode");
  });

  it("keeps the base label for a connected provider without an auth alias", () => {
    expect(resolveProviderLabel("opencode-go", true)).toBe("OpenCode Go");
  });

  it("falls back to the raw id for providers without a display name", () => {
    expect(resolveProviderLabel("unknown", true)).toBe("unknown");
    expect(resolveProviderLabel("unknown", false)).toBe("unknown");
  });

  it("never introduces `opencode-zen` as a display key", () => {
    expect(PROVIDER_DISPLAY_NAMES["opencode-zen"]).toBeUndefined();
  });
});