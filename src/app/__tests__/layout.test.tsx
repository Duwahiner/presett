import { afterEach, describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import RootLayout, { metadata } from "@/app/layout";

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

vi.mock("@/services/processService", () => ({
  probeGentleAiVersion: () => Promise.resolve({ ok: true, value: "v0.1.0" }),
}));

vi.mock("@/services/diagnosticsApiService", () => ({
  checkDiagnosticsUpdates: () =>
    Promise.resolve({
      settings: { frequencyMinutes: 360 },
      status: { phase: "idle" },
      notice: null,
    }),
  getDiagnostics: () =>
    Promise.resolve({
      cli: { installed: true, version: "v0.1.0" },
      config: { valid: true },
      models: { total: 0, valid: 0, invalid: 0 },
      profiles: { total: 0, active: 0 },
      backups: { total: 0, latest: null },
      updatedAt: null,
    }),
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

async function renderRootLayout(children: React.ReactNode) {
  // RootLayout is an async Server Component; await it to obtain the element
  // before mounting, so the full tree (ThemeProvider + DashboardLayout) renders
  // and the html/body classes are actually applied. The whole render runs inside
  // act() so async effect state updates (e.g. checkDiagnosticsUpdates) are flushed
  // and don't surface as React act(...) warnings.
  const isolatedDocument = document.implementation.createHTMLDocument("RootLayout test");
  let unmount: () => void = () => {};
  await act(async () => {
    const element = await RootLayout({ children });
    unmount = render(element, {
      container: isolatedDocument,
      baseElement: isolatedDocument.documentElement,
    }).unmount;
  });
  await act(async () => {});

  const cleanup = () => {
    unmount();
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
  it("renders without invalid document nesting warnings", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await renderRootLayout(<main>Content</main>);

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("applies font CSS variable classes to html and body", async () => {
    const { document: layoutDocument } = await renderRootLayout(<main>Content</main>);

    const html = layoutDocument.documentElement;
    const body = layoutDocument.body;

    expect(html.className).toContain("--font-inter");
    expect(html.className).toContain("--font-mono-jb");
    expect(body.className).toContain("font-sans");
  });

  it("wraps children in ThemeProvider", async () => {
    const { document: layoutDocument } = await renderRootLayout(
      <main data-testid="child">Content</main>,
    );

    expect(layoutDocument.querySelector("[data-testid='theme-provider']")).not.toBeNull();
    expect(layoutDocument.querySelector("[data-testid='child']")).not.toBeNull();
  });

  it("points both icon and apple metadata at /favicon.svg", () => {
    expect(metadata.icons).toEqual({
      icon: "/favicon.svg",
      apple: "/favicon.svg",
    });
  });
});
