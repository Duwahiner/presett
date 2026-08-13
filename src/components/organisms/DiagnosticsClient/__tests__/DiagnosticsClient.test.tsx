import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticsClient } from "../DiagnosticsClient";
import { checkDiagnosticsUpdates, getDiagnostics } from "@/services/diagnosticsApiService";

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
    render(<DiagnosticsClient />);

    expect(screen.getByRole("status").textContent).toContain("Loading diagnostics");
    expect(await screen.findByText("Gentle-AI CLI")).not.toBeNull();
    expect(screen.getByText("1.2.0")).not.toBeNull();
    expect(screen.getByText("State unavailable")).not.toBeNull();
    expect(screen.getByText("1.3.0")).not.toBeNull();
    expect(screen.getByText("1.4.0-rc.1")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
  });

  it("runs the manual release check with loading feedback and keeps the persistent notice visible", async () => {
    const user = userEvent.setup();
    render(<DiagnosticsClient />);

    expect((await screen.findByRole("alert")).textContent).toContain("Gentle-AI 1.3.0 is available on stable.");
    await user.click(screen.getByRole("button", { name: "Check Gentle-AI releases now" }));

    await waitFor(() => expect(checkDiagnosticsUpdates).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("alert").textContent).toContain("Gentle-AI 1.3.0 is available on stable.");
  });

  it("shows an accessible error when diagnostics cannot load", async () => {
    vi.mocked(getDiagnostics).mockRejectedValue(new Error("Local service unavailable"));

    render(<DiagnosticsClient />);

    expect((await screen.findByRole("alert")).textContent).toContain("Local service unavailable");
  });
});
