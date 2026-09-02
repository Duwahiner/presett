import { afterEach, describe, it, expect, vi } from "vitest";
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

vi.mock("@/lib/themeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

vi.mock("@/lib/visual-audit", () => ({
  IS_VISUAL_AUDIT_MODE: false,
}));

vi.mock("@/lib/visual-audit/auditContext", () => ({
  AuditModeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="audit-mode-provider">{children}</div>
  ),
  useAuditMode: () => false,
  AuditNotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useAuditNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    push: () => "noop",
    resolve: () => {},
    dismiss: () => {},
    markAllRead: () => {},
  }),
}));

const cleanupCallbacks: Array<() => void> = [];

function renderRootLayout(children: React.ReactNode) {
  const isolatedDocument = document.implementation.createHTMLDocument("RootLayout test");
  const result = render(<RootLayout>{children}</RootLayout>, {
    container: isolatedDocument,
    baseElement: isolatedDocument.documentElement,
  });

  const cleanup = () => {
    result.unmount();
    isolatedDocument.documentElement.replaceChildren();
  };

  cleanupCallbacks.push(cleanup);

  return { document: isolatedDocument };
}

afterEach(() => {
  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }
});

describe("RootLayout", () => {
  it("renders without invalid document nesting warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      renderRootLayout(<main>Content</main>);

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("applies font CSS variable classes to html and body", () => {
    const { document: layoutDocument } = renderRootLayout(<main>Content</main>);

    const html = layoutDocument.documentElement;
    const body = layoutDocument.body;

    expect(html.className).toContain("--font-inter");
    expect(html.className).toContain("--font-mono-jb");
    expect(body.className).toContain("font-sans");
  });

  it("wraps children in ThemeProvider", () => {
    const { document: layoutDocument } = renderRootLayout(
      <main data-testid="child">Content</main>,
    );

    expect(layoutDocument.querySelector("[data-testid='theme-provider']")).not.toBeNull();
    expect(layoutDocument.querySelector("[data-testid='child']")).not.toBeNull();
  });
});
