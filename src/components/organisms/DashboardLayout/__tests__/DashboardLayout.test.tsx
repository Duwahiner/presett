import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/DashboardLayout";
import { setLocale } from "@/resources/resources";
import { checkDiagnosticsUpdates } from "@/services/diagnosticsApiService";

const mockPathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn() }),
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

describe("DashboardLayout", () => {
  beforeEach(() => {
    setLocale("en");
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
    expect(screen.queryByText("Dashboard content")).not.toBeNull();
  });

  it("renders the topbar with theme toggle", () => {
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    expect(screen.getByRole("searchbox", { name: /search agents/i })).not.toBeNull();
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

  it("runs an active update check and renders a persistent notice with manual check", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockResolvedValue({
      status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
      settings: { frequencyMinutes: 60 },
      installedVersion: "1.2.0",
      channels: { stable: { latestVersion: "1.3.0", updateAvailable: true }, rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true } },
      notice: { channel: "stable", version: "1.3.0", pending: true },
    });
    const user = userEvent.setup();
    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    expect((await screen.findByRole("alert")).textContent).toContain("Gentle-AI 1.3.0 is available on stable.");
    await user.click(screen.getByRole("button", { name: "Check Gentle-AI releases now" }));
    expect(screen.getByRole("button", { name: "Check Gentle-AI releases now" })).not.toBeNull();
  });

  it("keeps the layout stable when the active update check fails", async () => {
    vi.mocked(checkDiagnosticsUpdates).mockRejectedValue(new Error("local service unavailable"));

    render(<DashboardLayout><main>Child</main></DashboardLayout>);

    expect(await screen.findByText("Child")).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
