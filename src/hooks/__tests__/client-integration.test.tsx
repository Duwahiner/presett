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
import type { ModelsClientViewProps } from "@/components/organisms/ModelsClient/ModelsClient.types";
import type { ProfilesClientViewProps } from "@/components/organisms/ProfilesClient/ProfilesClient.types";

vi.mock("@/components/organisms/ModelsClient/ModelsClient.view", () => ({
  ModelsClientView: ({ onSave, onSwitchProfile, onSync, onReset }: ModelsClientViewProps) => (
    <>
      <button onClick={() => void onSave("main", { provider: "openai", model: "gpt-5", variant: "high" })}>Save assignment</button>
      <button onClick={() => void onSwitchProfile("work")}>Switch profile</button>
      <button onClick={() => void onSync()}>Sync now</button>
      <button onClick={() => void onReset()}>Reset all</button>
    </>
  ),
}));

vi.mock("@/components/organisms/ProfilesClient/ProfilesClient.view", () => ({
  ProfilesClientView: ({
    editingProfile,
    onAssignmentChange,
    onCreate,
    onSwitch,
    onDelete,
    onEditStart,
    onEditSave,
  }: ProfilesClientViewProps) => (
    <>
      <button onClick={() => onAssignmentChange("orchestrator", { provider: "openai", model: "gpt-5", variant: "high" })}>Prepare create</button>
      <button onClick={() => void onCreate("new")}>Create profile</button>
      <button onClick={() => void onSwitch("work")}>Switch profile</button>
      <button onClick={() => void onDelete("work")}>Delete profile</button>
      <button onClick={() => onEditStart("work")}>Start update</button>
      {editingProfile && <button onClick={() => void onEditSave()}>Update profile</button>}
    </>
  ),
}));

/* ── Shared mocks ── */
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

const { runSync } = vi.hoisted(() => ({ runSync: vi.fn() }));
vi.mock("@/services/backupsApiService", () => ({
  listBackups: vi.fn().mockResolvedValue({ backups: [] }),
  runSync,
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
  runSync.mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
  vi.stubGlobal("confirm", vi.fn(() => true));
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

const unsafeError = "Request failed at C:\\Users\\person\\secret.txt\n    at mutation";

function expectNoPersistentNotification() {
  expect(JSON.parse(localStorage.getItem("presett_notifications") ?? "[]")).toHaveLength(0);
}

function expectSafePersistentError(title: string) {
  const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ severity: "error", title, message: "Request failed at" });
}

const modelOperations = [
  { name: "save assignment", button: "Save assignment", success: "Assignment saved.", title: "Unable to save assignment", reject: () => saveAssignment.mockRejectedValueOnce(new Error(unsafeError)) },
  { name: "switch profile", button: "Switch profile", success: "Profile switched.", title: "Unable to switch profile", reject: () => switchProfile.mockRejectedValueOnce(new Error(unsafeError)) },
  { name: "sync", button: "Sync now", success: "Sync completed successfully", title: "Sync Now", reject: () => runSync.mockRejectedValueOnce(new Error(unsafeError)) },
  { name: "reset", button: "Reset all", success: "Assignments reset.", title: "Reset All", reject: () => saveAssignment.mockRejectedValueOnce(new Error(unsafeError)) },
];

describe("ModelsClient notification integration", () => {
  it.each(modelOperations)("$name success shows Sonner feedback without persistence", async ({ button, success }) => {
    const user = userEvent.setup();
    render(<ModelsClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: button }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(success));
    expectNoPersistentNotification();
  });

  it.each(modelOperations)("$name error shows Sonner feedback and a safe panel notification", async ({ button, title, reject }) => {
    reject();
    const user = userEvent.setup();
    render(<ModelsClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: button }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(unsafeError));
    expectSafePersistentError(title);
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
const profileOperations = [
  { name: "create", button: "Create profile", success: "Profile created.", title: "Unable to create profile", prepare: async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Prepare create" })), reject: () => createProfile.mockRejectedValueOnce(new Error(unsafeError)) },
  { name: "switch", button: "Switch profile", success: "Profile switched.", title: "Profile switched.", prepare: async () => {}, reject: () => switchProfile.mockRejectedValueOnce(new Error(unsafeError)) },
  { name: "delete", button: "Delete profile", success: "Profile deleted.", title: "Unable to delete profile", prepare: async () => {}, reject: () => deleteProfile.mockRejectedValueOnce(new Error(unsafeError)) },
  { name: "update", button: "Update profile", success: "Profile updated.", title: "Unable to update profile", prepare: async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Start update" })), reject: () => updateProfile.mockRejectedValueOnce(new Error(unsafeError)) },
];

describe("ProfilesClient notification integration", () => {
  it.each(profileOperations)("$name success shows Sonner feedback without persistence", async ({ button, success, prepare }) => {
    const user = userEvent.setup();
    render(<ProfilesClient />, { wrapper });
    await prepare(user);
    await user.click(await screen.findByRole("button", { name: button }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(success));
    expectNoPersistentNotification();
  });

  it.each(profileOperations)("$name error shows Sonner feedback and a safe panel notification", async ({ button, title, prepare, reject }) => {
    reject();
    const user = userEvent.setup();
    render(<ProfilesClient />, { wrapper });
    await prepare(user);
    await user.click(await screen.findByRole("button", { name: button }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(unsafeError));
    expectSafePersistentError(title);
  });
});
