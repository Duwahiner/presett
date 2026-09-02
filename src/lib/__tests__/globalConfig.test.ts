import { describe, expect, it } from "vitest";
import { globalConfigPatchSchema } from "@/lib/validators";
import { resolveDisplayLocale } from "@/components/organisms/GlobalConfigClient/globalConfigClient";

describe("global config contracts", () => {
  it("accepts only the approved OpenCode fields", () => {
    expect(globalConfigPatchSchema.safeParse({ domain: "opencode", agentKey: "build", model: "openai/gpt-5", variant: "high" }).success).toBe(true);
    expect(globalConfigPatchSchema.safeParse({ domain: "opencode", agentKey: "build", model: "x", variant: "y", secret: "no" }).success).toBe(false);
  });

  it("accepts supported Gentle-AI locales and rejects unknown locales", () => {
    expect(globalConfigPatchSchema.safeParse({ domain: "gentle-ai", language: "es", persona: "builder" }).success).toBe(true);
    expect(globalConfigPatchSchema.safeParse({ domain: "gentle-ai", language: "fr" }).success).toBe(false);
  });
});

describe("resolveDisplayLocale", () => {
  it("preserves explicit locale and derives Spanish from browser locale", () => {
    expect(resolveDisplayLocale("en", "es-AR")).toBe("en");
    expect(resolveDisplayLocale(undefined, "es-AR")).toBe("es");
    expect(resolveDisplayLocale(undefined, "fr-FR")).toBe("en");
  });
});
