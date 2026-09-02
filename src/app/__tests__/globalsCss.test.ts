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
    expect(css).toContain("#e72286");
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

describe("globals.css v2 token contract", () => {
  it("sets --radius to 0rem for brutalist zero-radius", () => {
    expect(css).toContain("--radius: 0rem");
  });

  it("defines dark mode background as #000000 (pure black)", () => {
    // Dark mode tokens are in :root block (default dark)
    expect(css).toMatch(/--background:\s*#000000/);
    expect(css).toMatch(/\*::-webkit-scrollbar\s*\{\s*width:\s*8px/);
  });

  it("defines dark mode foreground as #ffffff (pure white)", () => {
    expect(css).toMatch(/--foreground:\s*#ffffff/);
  });

  it("defines dark mode card as #0a0a0a", () => {
    expect(css).toMatch(/--card:\s*#0a0a0a/);
  });

  it("defines dark mode primary as #e72286 (magenta)", () => {
    expect(css).toMatch(/--primary:\s*#e72286/);
  });

  it("defines dark mode accent as #73ec8b (green)", () => {
    expect(css).toMatch(/--accent:\s*#73ec8b/);
  });

  it("defines dark mode border as #ffffff (white)", () => {
    expect(css).toMatch(/--border:\s*#ffffff/);
  });

  it("defines light mode background as #f4f4f4 (light gray)", () => {
    expect(css).toMatch(/\.light[\s\S]*--background:\s*#f4f4f4/);
  });

  it("defines light mode card as #ffffff (pure white)", () => {
    expect(css).toMatch(/\.light[\s\S]*--card:\s*#ffffff/);
  });

  it("defines light mode border as #000000 (pure black)", () => {
    expect(css).toMatch(/\.light[\s\S]*--border:\s*#000000/);
  });

  it("defines light mode sidebar as #ffffff (white)", () => {
    expect(css).toMatch(/\.light[\s\S]*--sidebar:\s*#ffffff/);
  });

  it("uses a black scrollbar thumb in light mode", () => {
    expect(css).toMatch(/\.light[\s\S]*--scrollbar-thumb:\s*#000000/);
  });
});
