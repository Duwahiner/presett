import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import RootLayout from "@/app/layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  JetBrains_Mono: () => ({ variable: "--font-mono-jb" }),
}));

describe("RootLayout", () => {
  it("applies font CSS variable classes to html and body", () => {
    render(
      <RootLayout>
        <main>Content</main>
      </RootLayout>,
    );

    const html = document.documentElement;
    const body = document.body;

    expect(html.className).toContain("--font-inter");
    expect(html.className).toContain("--font-mono-jb");
    expect(body.className).toContain("font-sans");
  });
});
