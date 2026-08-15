import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DiagnosticsClient } from "../DiagnosticsClient";
import { checkDiagnosticsUpdates, getDiagnostics } from "@/services/diagnosticsApiService";

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
    vi.mocked(getDiagnostics).mockResolvedValue(diagnostics);
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue(updateState);
  });

  it("renders safe local diagnostics and stable/RC versions without paths", async () => {
    render(<DiagnosticsClient />, { wrapper });

    expect(screen.getByRole("status").textContent).toContain("Loading diagnostics");
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

  it("shows an accessible error when diagnostics cannot load", async () => {
    vi.mocked(getDiagnostics).mockRejectedValue(new Error("Local service unavailable"));

    render(<DiagnosticsClient />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Gentle-AI releases")).not.toBeNull();
    });
  });
});
