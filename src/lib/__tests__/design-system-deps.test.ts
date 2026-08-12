import { describe, it, expect } from "vitest";
import pkg from "@/../package.json";

describe("design-system dependencies", () => {
  it("includes required runtime dependencies", () => {
    const deps = new Set(Object.keys(pkg.dependencies ?? {}));

    expect(deps.has("@base-ui/react")).toBe(true);
    expect(deps.has("class-variance-authority")).toBe(true);
    expect(deps.has("next-themes")).toBe(true);
    expect(deps.has("lucide-react")).toBe(true);
    expect(deps.has("@radix-ui/react-slot")).toBe(false);
    expect(deps.has("@radix-ui/react-tabs")).toBe(false);
  });

  it("includes required dev dependencies", () => {
    const devDeps = new Set(Object.keys(pkg.devDependencies ?? {}));

    expect(devDeps.has("tw-animate-css")).toBe(true);
    expect(devDeps.has("shadcn")).toBe(true);
  });

  it("uses tailwind-merge v3 and lucide-react v1", () => {
    expect(pkg.dependencies["tailwind-merge"]).toMatch(/^\^3\./);
    expect(pkg.dependencies["lucide-react"]).toMatch(/^\^1\./);
  });
});
