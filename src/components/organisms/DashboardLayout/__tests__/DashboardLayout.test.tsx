import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/DashboardLayout";
import { setLocale } from "@/resources/resources";
import { checkDiagnosticsUpdates } from "@/services/diagnosticsApiService";

const mockPathname = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
  default ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    return <a href={href} {...rest}>{children}</a>;
  },
}));

vi.mock("@/services/diagnosticsApiService", () => ({
  checkDiagnosticsUpdates: vi.fn(async () => ({
    status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
    settings: { frequencyMinutes: 60 },
    installedVersion: "1.2.0",
    channels: { stable: { latestVersion: "1.3.0", updateAvailable: true }, rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true } },
    notice: { channel: "stable", version: "1.3.0", pending: true },
  })),
}));

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
  Toaster: () => null,
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale("en");
    mockPush.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockPathname.mockReturnValue("/");
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({ settings: { frequencyMinutes: 60 }, status: { phase: "idle" }, notice: null });
  });

  it("renders navigation links and children", () => {
    render(
      <DashboardLayout>
        <main>
          <h1>Dashboard content</h1>
        </main>
      </DashboardLayout>,
    );

    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Models" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Profiles" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Backups" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Diagnostics" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Search" })).toBeNull();
    expect(screen.queryByText("Dashboard content")).not.toBeNull();
  });

  it("redirects topbar searches to the global search page", async () => {
    mockPathname.mockReturnValue("/models");
    const user = userEvent.setup();
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    await user.type(screen.getByRole("searchbox", { name: /search agents/i }), "claude sonnet");
    await user.keyboard("{Enter}");

    expect(mockPush).toHaveBeenCalledWith("/search?q=claude%20sonnet");
  });

  it("clears the topbar search input with an accessible reset control", async () => {
    const user = userEvent.setup();
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const searchbox = screen.getByRole("searchbox", { name: /search agents/i });
    await user.type(searchbox, "claude");
    await user.click(screen.getByRole("button", { name: "Clear search input" }));

    expect((searchbox as HTMLInputElement).value).toBe("");
  });

  it("renders the topbar with theme toggle", () => {
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const searchbox = screen.getByRole("searchbox", { name: /search agents/i });
    expect(searchbox).not.toBeNull();
    expect(searchbox.getAttribute("placeholder")).toBe("Search PreSett…");
    expect(searchbox.className).toContain("bg-transparent");
    expect(searchbox.className).toContain("shadow-none");
    expect(searchbox.className).toContain("rounded-[.4rem]");
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).not.toBeNull();
  });

  it("highlights the active route in the sidebar", () => {
    mockPathname.mockReturnValue("/models");
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const modelsLink = screen.getByRole("link", { name: "Models" });
    expect(modelsLink.getAttribute("aria-current")).toBe("page");
  });

  it("highlights the diagnostics route in the sidebar", () => {
    mockPathname.mockReturnValue("/diagnostics");
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const diagnosticsLink = screen.getByRole("link", { name: "Diagnostics" });
    expect(diagnosticsLink.getAttribute("aria-current")).toBe("page");
  });

  it("renders Spanish navigation when locale is es", () => {
    setLocale("es");
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    expect(screen.getByRole("link", { name: "Panel de control" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Modelos" })).not.toBeNull();
  });

  it("opens and closes the mobile navigation drawer", async () => {
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const user = userEvent.setup();
    const menuButton = screen.getByRole("button", { name: "Open menu" });
    await user.click(menuButton);

    const mobileNav = screen.getByRole("navigation", { name: "Menu" });
    expect(within(mobileNav).getByRole("link", { name: "Models" })).not.toBeNull();
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
    expect(document.activeElement).toBe(menuButton);
  });

  it("closes the mobile navigation drawer when a link is selected", async () => {
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(within(screen.getByRole("navigation", { name: "Menu" })).getByRole("link", { name: "Models" }));

    expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
  });

  it("runs an active update check and persists update as a notification (not inline alert)", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({
      status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
      settings: { frequencyMinutes: 60 },
      installedVersion: "1.2.0",
      channels: { stable: { latestVersion: "1.3.0", updateAvailable: true }, rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true } },
      notice: { channel: "stable", version: "1.3.0", pending: true },
    });
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Wait for the async chain: mock → setUpdateState → useEffect → push → localStorage
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
      expect(stored.length).toBeGreaterThanOrEqual(1);
    });
    // Update should NOT render as an inline alert
    expect(screen.queryByRole("alert")).toBeNull();
    // Update should be persisted as a notification in localStorage
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.length).toBeGreaterThanOrEqual(1);
    const updateNotif = stored.find((n: { severity: string }) => n.severity === "update");
    expect(updateNotif).toBeDefined();
    expect(updateNotif.message).toContain("1.3.0");
  });

  it("update detection does not invoke toast.success or toast.error (Sonner stays silent)", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({
      status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
      settings: { frequencyMinutes: 60 },
      installedVersion: "1.2.0",
      channels: { stable: { latestVersion: "1.3.0", updateAvailable: true }, rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true } },
      notice: { channel: "stable", version: "1.3.0", pending: true },
    });

    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Wait for the async update detection chain to complete
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
      const updateNotif = stored.find((n: { severity: string }) => n.severity === "update");
      expect(updateNotif).toBeDefined();
    });

    // Sonner toast must NOT be invoked for update notifications
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("keeps the layout stable when the active update check fails", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockRejectedValue(new Error("local service unavailable"));

    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    expect(await screen.findByText("Child")).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("bell click opens notification panel and close button dismisses it", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({ settings: { frequencyMinutes: 60 }, status: { phase: "idle" }, notice: null });
    const user = userEvent.setup();
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Bell button exists and is accessible
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    expect(bellButton).not.toBeNull();

    // Click bell → panel opens with role=dialog
    await user.click(bellButton);
    const dialog = screen.getByRole("dialog", { name: /notifications/i });
    expect(dialog).not.toBeNull();
    // Panel shows empty state initially
    expect(screen.getByText("No notifications yet.")).not.toBeNull();

    // Close button dismisses the panel
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("bell shows unread badge and panel marks notifications as read", async () => {
    // Pre-populate localStorage with unread notification
    localStorage.setItem("presett_notifications", JSON.stringify([{
      id: "pre-existing", severity: "error", title: "Sync Error", message: "Backup failed",
      status: "unread", inProgress: false, createdAt: new Date().toISOString(),
    }]));

    const user = userEvent.setup();
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Bell shows unread badge
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    expect(screen.getByText("1")).not.toBeNull();

    // Open panel → notification appears
    await user.click(bellButton);
    expect(screen.getByText("Sync Error")).not.toBeNull();

    // Panel marks all as read → badge clears
    await waitFor(() => {
      expect(screen.queryByText("1")).toBeNull();
    });
  });

  it("sync operation uses lifecycle: in-progress info → resolve on completion", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({ settings: { frequencyMinutes: 60 }, status: { phase: "idle" }, notice: null });
    const user = userEvent.setup();
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Click sync button → creates in-progress notification
    const syncButton = screen.getByRole("button", { name: /sync/i });
    await user.click(syncButton);

    // Panel shows in-progress spinner entry
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
      const inProgress = stored.find((n: { inProgress: boolean }) => n.inProgress === true);
      expect(inProgress).toBeDefined();
      expect(inProgress.severity).toBe("info");
    });

    // After sync completes → entry resolves (inProgress = false)
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
      const resolved = stored.find((n: { id: string }) => n.id !== undefined);
      // The entry should exist and be resolved (not in progress)
      expect(resolved).toBeDefined();
      expect(resolved.inProgress).toBe(false);
    });
  });
});
