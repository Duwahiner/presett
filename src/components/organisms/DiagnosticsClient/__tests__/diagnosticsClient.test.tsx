import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { NotificationProvider } from "@/contexts/notificationContext";
import { DiagnosticsClient } from "../diagnosticsClient";
import { checkDiagnosticsUpdates, getDiagnostics } from "@/services/diagnosticsApiService";
import { hasNotifiedUpdate } from "@/services/notificationService";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

vi.mock("@/services/diagnosticsApiService", () => ({
  getDiagnostics: vi.fn(),
  checkDiagnosticsUpdates: vi.fn(),
}));

const diagnostics = {
  cli: { installed: true, version: "1.2.0" },
  config: { available: true },
  state: { available: false, error: "State unavailable" },
  routes: {
    config: { exists: true, readable: true, writable: true },
    state: { exists: false, readable: false, writable: false },
    backups: { exists: true, readable: true, writable: false },
  },
};

const updateState = {
  status: { phase: "success" as const, checkedAt: "2026-08-13T10:00:00.000Z" },
  settings: { frequencyMinutes: 60 },
  installedVersion: "1.2.0",
  channels: {
    stable: { latestVersion: "1.3.0", updateAvailable: true },
    rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true },
  },
  notice: { channel: "stable" as const, version: "1.3.0", pending: true },
};

describe("DiagnosticsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getDiagnostics).mockResolvedValue(diagnostics);
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue(updateState);
  });

  it("renders safe local diagnostics and stable/RC versions without paths", async () => {
    render(<DiagnosticsClient />, { wrapper });

    expect(screen.getAllByRole("status").some((s) => s.textContent?.includes("Loading"))).toBe(true);
    expect(await screen.findByText("Gentle-AI CLI")).not.toBeNull();
    expect(screen.getByText("1.2.0")).not.toBeNull();
    expect(screen.getByText("State unavailable")).not.toBeNull();
    expect(screen.getByText("1.3.0")).not.toBeNull();
    expect(screen.getByText("1.4.0-rc.1")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
  });

  it("runs the manual release check and persists update as a notification (not inline alert)", async () => {
    const user = userEvent.setup();
    render(<DiagnosticsClient />, { wrapper });

    // Wait for loading to complete
    await screen.findByText("Gentle-AI CLI");

    // Update should NOT render as an inline alert
    expect(screen.queryByRole("alert")).toBeNull();
    // Update should be persisted as a notification in localStorage
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.length).toBeGreaterThanOrEqual(1);
    const updateNotif = stored.find((n: { severity: string }) => n.severity === "update");
    expect(updateNotif).toBeDefined();
    expect(updateNotif.message).toContain("1.3.0");

    await user.click(screen.getByRole("button", { name: "Check Gentle-AI releases now" }));

    await waitFor(() => expect(checkDiagnosticsUpdates).toHaveBeenCalledTimes(2));
    // Still no inline alert after manual check
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("surfaces a visible toast when an update is detected on page load", async () => {
    render(<DiagnosticsClient />, { wrapper });

    await screen.findByText("Gentle-AI CLI");
    expect(mockToast.info).toHaveBeenCalledTimes(1);
    expect(mockToast.info).toHaveBeenCalledWith(expect.stringContaining("1.3.0"));
    // Update remains available in the persistent bell store, not only a toast.
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.some((n: { severity: string }) => n.severity === "update")).toBe(true);
  });

  it("does not show a false success/update toast when the check fails", async () => {
    vi.mocked(getDiagnostics).mockResolvedValue(diagnostics);
    vi.mocked(checkDiagnosticsUpdates).mockRejectedValue(new Error("Network error"));

    render(<DiagnosticsClient />, { wrapper });

    await screen.findByText("Gentle-AI releases");
    expect(mockToast.info).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("persists a single update notification across remounts (semantic dedupe)", async () => {
    const { unmount } = render(<DiagnosticsClient />, { wrapper });
    await screen.findByText("Gentle-AI CLI");
    await waitFor(() => expect(mockToast.info).toHaveBeenCalledTimes(1));
    unmount();

    // Remount simulates navigation back to diagnostics; same release must not re-notify.
    render(<DiagnosticsClient />, { wrapper });
    await screen.findByText("Gentle-AI CLI");

    expect(mockToast.info).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.filter((n: { severity: string }) => n.severity === "update")).toHaveLength(1);
    expect(hasNotifiedUpdate("1.3.0", "stable")).toBe(true);
  });

  it("adopts the brutalist class/style contract", async () => {
    const { container } = render(<DiagnosticsClient />, { wrapper });
    await screen.findByText("Gentle-AI CLI");

    // Sharp corners: no rounded-* utilities anywhere in the client.
    const classNames = Array.from(container.querySelectorAll<HTMLElement>("[class]")).map((el) => el.className);
    const flattened = classNames.join(" ");
    expect(flattened).not.toMatch(/rounded-(sm|md|lg|xl|2xl|3xl|full)/);

    // High-contrast borders and hard-shadow interaction treatment.
    expect(flattened).toContain("border-border");
    expect(flattened).toContain("shadow-[4px_4px_0_0_var(--foreground)]");
    expect(flattened).toContain("active:shadow-none");

    // Mono/uppercase structural labels.
    expect(flattened).toContain("font-mono");
    expect(flattened).toContain("uppercase");

    // Semantic tokens only (no raw palette hex).
    expect(flattened).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("shows an accessible error when diagnostics cannot load", async () => {
    vi.mocked(getDiagnostics).mockRejectedValue(new Error("Local service unavailable"));

    render(<DiagnosticsClient />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Gentle-AI releases")).not.toBeNull();
    });
  });
});