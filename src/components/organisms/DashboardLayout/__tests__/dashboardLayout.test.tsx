import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/dashboardLayout";
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

const { mockToastSuccess, mockToastError, mockToastInfo } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError, info: mockToastInfo },
  Toaster: () => null,
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale("en");
    mockPush.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockToastInfo.mockClear();
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
    expect(screen.queryByRole("link", { name: "SDD Profiles" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Backups" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeNull();
    expect(screen.queryByText("Agents")).toBeNull();
    expect(screen.queryByText("Sync Activity")).toBeNull();
    expect(screen.queryByText("Permissions")).toBeNull();
    expect(screen.queryByRole("link", { name: "Search" })).toBeNull();
    expect(screen.queryByText("Dashboard content")).not.toBeNull();
    expect(screen.getByText("Gentleman Stack")).not.toBeNull();
    expect(screen.getByText("full-gentleman")).not.toBeNull();
  });

  it("renders a Diagnostics sidebar link to /diagnostics", () => {
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const link = screen.getByRole("link", { name: "Diagnostics" });
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("/diagnostics");
  });

  it("renders the usage stats navigation entry linking to the camelCase route", () => {
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const link = screen.getByRole("link", { name: "Usage" });
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("/usageStats");
  });

  it("renders the compact Gentle-AI version below the Sync Configs CTA in the sidebar footer", () => {
    render(
      <DashboardLayout gentleAiVersion="v2.4.0">
        <main>Child</main>
      </DashboardLayout>,
    );

    const version = screen.getByText("v2.4.0");
    const versionCard = version.parentElement;
    const syncButton = screen.getByRole("button", { name: /sync configs/i });

    expect(screen.getByText("Gentle-AI")).not.toBeNull();
    expect(versionCard?.className).toContain("border");
    expect(versionCard?.className).toContain("border-border");
    expect(versionCard?.className).toContain("bg-card");
    expect(versionCard?.compareDocumentPosition(syncButton)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
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
    const topbar = searchbox.closest("header");
    expect(topbar?.className).toContain("h-[74px]");
    expect(topbar?.className).toContain("border-b");
    expect(topbar?.className).toContain("sm:px-6");
    expect(screen.getByRole("button", { name: "Light mode" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Dark mode" })).not.toBeNull();
  });

  it("exposes exactly one meaningful PreSett logo per theme in the sidebar header", () => {
    const { container } = render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const lightLogo = container.querySelector<HTMLImageElement>('img[src="/logo.svg"]');
    const darkLogo = container.querySelector<HTMLImageElement>('img[src="/logo_dark.svg"]');
    expect(lightLogo).not.toBeNull();
    expect(darkLogo).not.toBeNull();

    // Both theme variants carry the meaningful accessible brand name; dark is not decorative
    expect(lightLogo?.getAttribute("alt")).toBe("PreSett");
    expect(darkLogo?.getAttribute("alt")).toBe("PreSett");
    expect(darkLogo?.getAttribute("aria-hidden")).toBeNull();
    expect(darkLogo?.getAttribute("src")).toBe("/logo_dark.svg");

    // Visibility classes implement the theme swap without aria-hidden/empty alt
    expect(lightLogo?.className).toContain("h-7.5");
    expect(lightLogo?.className).toContain("w-auto");
    expect(lightLogo?.className).toContain("dark:hidden");
    expect(lightLogo?.className).not.toContain("bg-white");
    expect(lightLogo?.className).not.toContain("p-1");
    expect(darkLogo?.className).toContain("hidden");
    expect(darkLogo?.className).toContain("dark:block");
    expect(darkLogo?.className).toContain("h-7.5");
    expect(darkLogo?.className).toContain("w-auto");
    expect(darkLogo?.className).not.toContain("bg-white");
    expect(darkLogo?.className).not.toContain("p-1");

    // LIGHT theme: dark logo is display:none (hidden), light logo exposed -> exactly one name
    darkLogo!.style.display = "none";
    const lightModeLogos = screen.getAllByRole("img", { name: "PreSett" });
    expect(lightModeLogos).toHaveLength(1);
    expect(lightModeLogos[0].getAttribute("src")).toBe("/logo.svg");

    // DARK theme: light logo is display:none (dark:hidden), dark logo exposed -> exactly one name
    lightLogo!.style.display = "none";
    darkLogo!.style.display = "block";
    const darkModeLogos = screen.getAllByRole("img", { name: "PreSett" });
    expect(darkModeLogos).toHaveLength(1);
    expect(darkModeLogos[0].getAttribute("src")).toBe("/logo_dark.svg");
  });

  it("exposes exactly one meaningful PreSett logo per theme in the mobile navigation header", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Menu" });

    const lightLogo = mobileNav.querySelector<HTMLImageElement>('img[src="/logo.svg"]');
    const darkLogo = mobileNav.querySelector<HTMLImageElement>('img[src="/logo_dark.svg"]');
    expect(lightLogo).not.toBeNull();
    expect(darkLogo).not.toBeNull();

    // Both theme variants carry the meaningful accessible brand name; dark is not decorative
    expect(lightLogo?.getAttribute("src")).toBe("/logo.svg");
    expect(darkLogo?.getAttribute("src")).toBe("/logo_dark.svg");
    expect(darkLogo?.getAttribute("alt")).toBe("PreSett");
    expect(darkLogo?.getAttribute("aria-hidden")).toBeNull();

    // Visibility classes implement the theme swap without aria-hidden/empty alt
    expect(lightLogo?.className).toContain("h-5.5");
    expect(lightLogo?.className).toContain("w-auto");
    expect(lightLogo?.className).toContain("dark:hidden");
    expect(lightLogo?.className).not.toContain("bg-white");
    expect(lightLogo?.className).not.toContain("p-1");
    expect(darkLogo?.className).toContain("hidden");
    expect(darkLogo?.className).toContain("dark:block");
    expect(darkLogo?.className).toContain("h-5.5");
    expect(darkLogo?.className).toContain("w-auto");
    expect(darkLogo?.className).not.toContain("bg-white");
    expect(darkLogo?.className).not.toContain("p-1");

    // LIGHT theme: dark logo hidden -> exactly one name exposed within the mobile nav
    darkLogo!.style.display = "none";
    const lightModeLogos = within(mobileNav).getAllByRole("img", { name: "PreSett" });
    expect(lightModeLogos).toHaveLength(1);
    expect(lightModeLogos[0].getAttribute("src")).toBe("/logo.svg");

    // DARK theme: light logo hidden -> exactly one name exposed (the dark logo)
    lightLogo!.style.display = "none";
    darkLogo!.style.display = "block";
    const darkModeLogos = within(mobileNav).getAllByRole("img", { name: "PreSett" });
    expect(darkModeLogos).toHaveLength(1);
    expect(darkModeLogos[0].getAttribute("src")).toBe("/logo_dark.svg");

    // Desktop and mobile each render the theme-swapped logo pair
    expect(container.querySelectorAll('img[src="/logo_dark.svg"]').length).toBe(2);
  });

  it("keeps the Dashboard shell fixed without scrolling the shared main region", () => {
    render(<DashboardLayout><div>Dashboard content</div></DashboardLayout>);

    const main = screen.getByText("Dashboard content").closest("main");
    expect(main?.className).toContain("min-h-0");
    expect(main?.className).toContain("overflow-hidden");
    expect(main?.className).not.toContain("overflow-y-auto");
  });

  it("keeps non-Dashboard routes scrollable inside the shared main region", () => {
    mockPathname.mockReturnValue("/models");
    render(<DashboardLayout><div>Models content</div></DashboardLayout>);

    const main = screen.getByText("Models content").closest("main");
    expect(main?.className).toContain("overflow-y-auto");
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
    expect(modelsLink.className).toContain("shadow-[2px_2px_0_0_var(--foreground)]");
  });

  it("highlights the settings route in the sidebar", () => {
    mockPathname.mockReturnValue("/settings");
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const settingsLink = screen.getByRole("link", { name: "Settings" });
    expect(settingsLink.getAttribute("aria-current")).toBe("page");
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
    expect(diagnosticsLink.className).toContain("shadow-[2px_2px_0_0_var(--foreground)]");
  });

  it("exposes the diagnostics entry in the mobile navigation drawer", async () => {
    const user = userEvent.setup();
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = screen.getByRole("navigation", { name: "Menu" });
    const diagnosticsLink = within(mobileNav).getByRole("link", { name: "Diagnostics" });
    expect(diagnosticsLink.getAttribute("href")).toBe("/diagnostics");
  });

  it("renders the translated diagnostics navigation label in Spanish", () => {
    setLocale("es");
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const link = screen.getByRole("link", { name: "Diagnósticos" });
    expect(link.getAttribute("href")).toBe("/diagnostics");
  });

  it("renders Spanish navigation when locale is es", () => {
    setLocale("es");
    render(
      <DashboardLayout gentleAiVersion="v2.4.0">
        <main>Child</main>
      </DashboardLayout>,
    );

    expect(screen.getByRole("link", { name: "Panel de control" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Modelos" })).not.toBeNull();
    expect(screen.getByText("Gentle-AI")).not.toBeNull();
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

  it("surfaces a visible toast when an update is detected on page load", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({
      status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
      settings: { frequencyMinutes: 60 },
      installedVersion: "1.2.0",
      channels: { stable: { latestVersion: "1.3.0", updateAvailable: true }, rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true } },
      notice: { channel: "stable", version: "1.3.0", pending: true },
    });

    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Update is visibly surfaced at detection time via the Sonner toast mechanism.
    await waitFor(() => expect(mockToastInfo).toHaveBeenCalledTimes(1));
    expect(mockToastInfo).toHaveBeenCalledWith(expect.stringContaining("1.3.0"));
    // It is NOT reported as a generic success/error toast.
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
    // And it remains available in the persistent bell store (not only a toast).
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.some((n: { severity: string }) => n.severity === "update")).toBe(true);
  });

  it("does not duplicate the update notification for the same release across reloads", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({
      status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
      settings: { frequencyMinutes: 60 },
      installedVersion: "1.2.0",
      channels: { stable: { latestVersion: "1.3.0", updateAvailable: true }, rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true } },
      notice: { channel: "stable", version: "1.3.0", pending: true },
    });

    // First mount: update detected and notified.
    const { unmount } = render(<DashboardLayout><main>Child</main></DashboardLayout>);
    await waitFor(() => expect(mockToastInfo).toHaveBeenCalledTimes(1));
    unmount();

    // Reload (fresh mount): same release must NOT re-notify.
    render(<DashboardLayout><main>Child</main></DashboardLayout>);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
      expect(stored.filter((n: { severity: string }) => n.severity === "update")).toHaveLength(1);
    });
    expect(mockToastInfo).toHaveBeenCalledTimes(1);
  });

  it("does not show a false update indication when the release check fails", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockRejectedValue(new Error("local service unavailable"));

    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    expect(await screen.findByText("Child")).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mockToastInfo).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem("presett_notifications") ?? "[]");
    expect(stored.some((n: { severity: string }) => n.severity === "update")).toBe(false);
  });

  it("keeps the layout stable when the active update check fails", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockRejectedValue(new Error("local service unavailable"));

    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    expect(await screen.findByText("Child")).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("bell click opens notification panel and outside click dismisses it", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({ settings: { frequencyMinutes: 60 }, status: { phase: "idle" }, notice: null });
    const user = userEvent.setup();
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Bell button exists and is accessible
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    expect(bellButton).not.toBeNull();

    // Click bell → panel opens (Radix Popover)
    await user.click(bellButton);
    // Panel shows empty state initially
    expect(screen.getByText("No notifications yet.")).not.toBeNull();

    // Click outside dismisses the panel (Radix handles this)
    await user.click(document.body);
    await waitFor(() => {
      expect(screen.queryByText("No notifications yet.")).toBeNull();
    });
  });

  it("bell shows unread badge and panel marks notifications as read", async () => {
    // Pre-populate localStorage with unread notification
    localStorage.setItem("presett_notifications", JSON.stringify([{
      id: "pre-existing", severity: "error", title: "Sync Error", message: "Backup failed",
      status: "unread", inProgress: false, createdAt: new Date().toISOString(),
    }]));

    const user = userEvent.setup();
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Bell shows unread badge indicator
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    expect(bellButton.querySelector(".bg-primary")).not.toBeNull();

    // Open panel → notification appears
    await user.click(bellButton);
    expect(screen.getByText("Sync Error")).not.toBeNull();

    // Panel marks all as read → badge clears
    await waitFor(() => {
      expect(bellButton.querySelector(".bg-primary")).toBeNull();
    });
  });

  it("sync operation uses lifecycle: in-progress info → resolve on completion", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({ settings: { frequencyMinutes: 60 }, status: { phase: "idle" }, notice: null });
    const user = userEvent.setup();
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    // Click sync button → creates in-progress notification
    const syncButton = screen.getByRole("button", { name: /sync/i });
    expect(syncButton.className).toContain("shadow-[4px_4px_0_0_var(--foreground)]");
    expect(syncButton.className).toContain("active:translate-x-1");
    expect(syncButton.className).toContain("active:translate-y-1");
    expect(syncButton.className).toContain("active:shadow-none");
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
