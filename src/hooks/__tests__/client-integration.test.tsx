import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { BackupsClient } from "@/components/organisms/BackupsClient/BackupsClient";
import { GlobalConfigClient } from "@/components/organisms/GlobalConfigClient/GlobalConfigClient";
import { DiagnosticsClient } from "@/components/organisms/DiagnosticsClient/DiagnosticsClient";
import { ModelsClient } from "@/components/organisms/ModelsClient/ModelsClient";
import { ProfilesClient } from "@/components/organisms/ProfilesClient/ProfilesClient";

/* ── Shared mocks ── */
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@/services/backupsApiService", () => ({
  listBackups: vi.fn().mockResolvedValue({ backups: [] }),
  runSync: vi.fn(),
  pinBackup: vi.fn().mockResolvedValue(undefined),
  unpinBackup: vi.fn().mockResolvedValue(undefined),
  deleteBackup: vi.fn().mockResolvedValue(undefined),
  restoreBackup: vi.fn().mockResolvedValue(undefined),
}));

const { getGlobalConfig, patchGlobalConfig, getCatalog, getConfig, saveAssignment } = vi.hoisted(() => ({
  getGlobalConfig: vi.fn(),
  patchGlobalConfig: vi.fn(),
  getCatalog: vi.fn(),
  getConfig: vi.fn(),
  saveAssignment: vi.fn(),
}));
vi.mock("@/services/globalConfigApiService", () => ({ getGlobalConfig, patchGlobalConfig }));
vi.mock("@/services/modelsApiService", () => ({ getCatalog, getConfig, saveAssignment }));

const { listProfiles, createProfile, switchProfile, deleteProfile, updateProfile } = vi.hoisted(() => ({
  listProfiles: vi.fn(),
  createProfile: vi.fn(),
  switchProfile: vi.fn(),
  deleteProfile: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock("@/services/profilesApiService", () => ({
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  updateProfile,
}));

const { mockGetDiagnostics, mockCheckUpdates } = vi.hoisted(() => ({
  mockGetDiagnostics: vi.fn(),
  mockCheckUpdates: vi.fn(),
}));
vi.mock("@/services/diagnosticsApiService", () => ({
  getDiagnostics: mockGetDiagnostics,
  checkDiagnosticsUpdates: mockCheckUpdates,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  getGlobalConfig.mockResolvedValue({
    defaultAgent: "main",
    agents: ["main"],
    assignments: [{ agentKey: "main", provider: "openai", model: "gpt-5", variant: "high" }],
    gentleAi: { language: "en", persona: "Builder" },
  });
  getCatalog.mockResolvedValue({ catalog: { openai: { "gpt-5": ["high"] } } });
  listProfiles.mockResolvedValue({
    profiles: [{ name: "work", displayName: "Work", active: false, modelCount: 1 }],
  });
  switchProfile.mockResolvedValue(undefined);
  createProfile.mockResolvedValue(undefined);
  deleteProfile.mockResolvedValue(undefined);
  updateProfile.mockResolvedValue(undefined);
  getConfig.mockResolvedValue({
    assignments: [{ agentKey: "main", provider: "openai", model: "gpt-5", variant: "high" }],
    defaultAgent: "main",
  });
  mockGetDiagnostics.mockResolvedValue({
    cli: { installed: true, version: "1.2.0" },
    config: { available: true },
    state: { available: false, error: "State unavailable" },
    routes: {
      config: { exists: true, readable: true, writable: true },
      state: { exists: false, readable: false, writable: false },
      backups: { exists: true, readable: true, writable: false },
    },
  });
  mockCheckUpdates.mockResolvedValue({
    status: { phase: "success", checkedAt: "2026-01-01T00:00:00.000Z" },
    settings: { frequencyMinutes: 60 },
    installedVersion: "1.2.0",
    channels: { stable: { latestVersion: "1.3.0", updateAvailable: true }, rc: { latestVersion: "1.4.0-rc.1", updateAvailable: false } },
    notice: { channel: "stable", version: "1.3.0", pending: true },
  });
});

/* ── ModelsClient ── */
describe("ModelsClient notification integration", () => {
  it("sync success shows success toast without persisting", async () => {
    const { runSync } = await import("@/services/backupsApiService");
    vi.mocked(runSync).mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
    const user = userEvent.setup();

    render(<ModelsClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Sync Now" }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(JSON.parse(localStorage.getItem("presett_notifications") ?? "[]")).toHaveLength(0);
  });

  it("sync error shows error toast and persists a safe notification", async () => {
    const { runSync } = await import("@/services/backupsApiService");
    vi.mocked(runSync).mockRejectedValue(new Error("Sync failed"));
    const user = userEvent.setup();

    render(<ModelsClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Sync Now" }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Sync failed"));
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ severity: "error", message: "Sync failed" });
    expect(stored[0].message).not.toMatch(/[A-Za-z]:\\|\//);
  });
});

/* ── BackupsClient ── */
describe("BackupsClient notification integration", () => {
  it("sync error pushes persistent notification and shows error toast", async () => {
    const { runSync } = await import("@/services/backupsApiService");
    vi.mocked(runSync).mockRejectedValue(new Error("Connection refused"));
    const user = userEvent.setup();

    render(<BackupsClient />, { wrapper });
    await screen.findByText("Run Sync");
    await user.click(screen.getByRole("button", { name: /run sync/i }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Connection refused"));
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].severity).toBe("error");
  });

  it("sync success shows success toast without persisting", async () => {
    const { runSync } = await import("@/services/backupsApiService");
    vi.mocked(runSync).mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
    const user = userEvent.setup();

    render(<BackupsClient />, { wrapper });
    await screen.findByText("Run Sync");
    await user.click(screen.getByRole("button", { name: /run sync/i }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored).toHaveLength(0);
  });
});

/* ── GlobalConfigClient ── */
describe("GlobalConfigClient notification integration", () => {
  it("save error pushes persistent notification and shows error toast", async () => {
    patchGlobalConfig.mockRejectedValue(new Error("Save failed"));
    const user = userEvent.setup();
    render(<GlobalConfigClient />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Save Gentle-AI" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.length).toBeGreaterThanOrEqual(1);
    expect(stored[stored.length - 1].severity).toBe("error");
  });

  it("save success shows success toast without persisting", async () => {
    patchGlobalConfig.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<GlobalConfigClient />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Save Gentle-AI" }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored).toHaveLength(0);
  });
});

/* ── DiagnosticsClient ── */
describe("DiagnosticsClient notification integration", () => {
  it("load error pushes persistent notification and shows error toast", async () => {
    mockGetDiagnostics.mockRejectedValue(new Error("Service unavailable"));
    render(<DiagnosticsClient />, { wrapper });

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.length).toBeGreaterThanOrEqual(1);
    expect(stored[stored.length - 1].severity).toBe("error");
  });

  it("release check error pushes notification and shows error toast", async () => {
    render(<DiagnosticsClient />, { wrapper });
    await waitFor(() => expect(screen.getByText("Gentle-AI CLI")).not.toBeNull());

    mockCheckUpdates.mockRejectedValue(new Error("Network error"));
    await userEvent.click(screen.getByRole("button", { name: /check.*releases/i }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
  });
});

/* ── ProfilesClient ── */
describe("ProfilesClient notification integration", () => {
  it("switch success shows a toast without persisting a notification", async () => {
    const user = userEvent.setup();
    render(<ProfilesClient />, { wrapper });

    await screen.findByText("Work");
    await user.click(screen.getByRole("button", { name: "Switch" }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored).toHaveLength(0);
  });

  it("switch error shows a toast and persists a sanitized notification", async () => {
    switchProfile.mockRejectedValue(
      new Error("Switch failed at C:\\Users\\person\\secret.txt\n    at switchProfile"),
    );
    const user = userEvent.setup();
    render(<ProfilesClient />, { wrapper });

    await screen.findByText("Work");
    await user.click(screen.getByRole("button", { name: "Switch" }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].severity).toBe("error");
    expect(stored[0].message).not.toContain("C:\\Users");
    expect(stored[0].message).not.toContain("at switchProfile");
  });
});
