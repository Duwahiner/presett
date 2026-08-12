import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import RootLayout from "@/app/layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  JetBrains_Mono: () => ({ variable: "--font-mono-jb" }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
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

  it("wraps children in ThemeProvider", () => {
    render(
      <RootLayout>
        <main data-testid="child">Content</main>
      </RootLayout>,
    );

    expect(document.querySelector("[data-testid='theme-provider']")).not.toBeNull();
    expect(document.querySelector("[data-testid='child']")).not.toBeNull();
  });
});
