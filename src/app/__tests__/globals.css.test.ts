import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(
  resolve(import.meta.dirname, "../globals.css"),
  "utf-8",
);

describe("globals.css token system", () => {
  it("defines light :root tokens", () => {
    expect(css).toContain(":root");
    expect(css).toContain("--color-primary");
    expect(css).toContain("oklch");
  });

  it("defines dark tokens", () => {
    expect(css).toContain(".dark");
    expect(css).toContain("--color-background");
  });

  it("imports tw-animate-css and shadcn tailwind", () => {
    expect(css).toContain("tw-animate-css");
    expect(css).toContain("shadcn/tailwind.css");
  });
});
