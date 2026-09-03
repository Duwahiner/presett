import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "@/components/organisms/Dashboard/dashboard";
import { t, setLocale } from "@/resources/resources";
import type { DashboardStats } from "@/components/organisms/Dashboard/dashboardTypes";

vi.mock("next/link", () => ({
  default ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

const defaultStats: DashboardStats = {
  modelCount: 5,
  profileCount: 3,
  backupCount: 28,
  lastBackup: "2026-08-10T20:00:00Z",
};

const defaultAgents = [
  {
    agentKey: "sdd-orchestrator-default",
    provider: "openai",
    model: "gpt-4o",
    variant: "latest",
  },
];

describe("Dashboard", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("renders stat values from props", () => {
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.queryByText("5")).not.toBeNull();
    expect(screen.queryByText("3")).not.toBeNull();
    expect(screen.queryByText("28")).not.toBeNull();
    expect(screen.queryByText(defaultStats.lastBackup)).not.toBeNull();
    expect(screen.queryByText("Last backup")).not.toBeNull();
    expect(screen.queryByText("Last sync")).not.toBeNull();
    expect(screen.queryByText("Never")).not.toBeNull();
  });

  it("renders different stat values from props", () => {
    const stats: DashboardStats = {
      modelCount: 12,
      profileCount: 7,
      backupCount: 99,
      lastBackup: "Yesterday",
    };

    render(<Dashboard stats={stats} agents={defaultAgents} />);

    expect(screen.queryByText("12")).not.toBeNull();
    expect(screen.queryByText("7")).not.toBeNull();
    expect(screen.queryByText("99")).not.toBeNull();
    expect(screen.queryByText("Yesterday")).not.toBeNull();
  });

  it("renders agent tiles from real configuration", () => {
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.queryByLabelText("sdd-orchestrator-default")).not.toBeNull();
  });

  it("renders agent and add-agent tiles with the dashboard card geometry", () => {
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    const agentCard = screen.getByLabelText("sdd-orchestrator-default").closest("div[class*='min-h-[188px]']");
    const addAgentTile = screen.getByRole("link", { name: /add agent/i }).firstElementChild;

    expect(agentCard?.className).toContain("border");
    expect(agentCard?.className).toContain("border-border");
    expect(agentCard?.className).toContain("p-5");
    expect(agentCard?.className).toContain("shadow-[4px_4px_0_0_var(--foreground)]");
    expect(agentCard?.className).not.toContain("hover:shadow-none");
     expect(screen.getByText("Configured").className).not.toContain("rounded-full");
     expect(screen.getByText("Configured").className).toContain("border-accent");
     expect(screen.getByText("Configured").className).toContain("bg-transparent");
     expect(screen.getByText("Configured").className).toContain("light:!border-black");
     expect(screen.getByText("Configured").className).toContain("light:!bg-white");
     expect(screen.getByText("Configured").className).toContain("light:!text-black");
    expect(addAgentTile?.className).toContain("min-h-[188px]");
    expect(addAgentTile?.className).toContain("border-border");
    expect(agentCard?.parentElement?.className).toContain("scrollbar-brutal");
    expect(agentCard?.parentElement?.className).toContain("overflow-y-auto");
  });

  it("uses black status-badge content in light mode for every agent state", () => {
    render(
      <Dashboard
        stats={defaultStats}
        agents={[...defaultAgents, { agentKey: "partial-agent", provider: "", model: "", variant: "" }]}
      />,
    );

    expect(screen.getByText("Configured").className).toContain("light:!border-black");
    expect(screen.getByText("Partial").className).toContain("light:!border-black");
    expect(screen.getByText("Partial").className).toContain("light:!text-black");
  });

  it("renders links to each management page", () => {
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.queryByRole("link", { name: /configure models/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /switch sdd profile/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /restore backup/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /manage all/i })?.getAttribute("href")).toBe("/models");
  });

  it("renders translated Spanish text when locale is es", () => {
    setLocale("es");
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.queryByText(t("dashboard_title"))).not.toBeNull();
    expect(screen.queryByText(t("dashboard_stat_models_label"))).not.toBeNull();
    expect(screen.queryByText(t("dashboard_stat_profiles_label"))).not.toBeNull();
    expect(screen.queryByText(t("dashboard_stat_backups_label"))).not.toBeNull();
  });

  it("keeps the dashboard composition grouped into framed agent and quick action panels", () => {
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.getByRole("heading", { name: "Installed agents" }).parentElement?.parentElement?.className).toContain("border");
    expect(screen.getByRole("heading", { name: "Quick Access" }).parentElement?.className).toContain("border");
    expect(screen.getByText("TDD strict mode").parentElement?.className).toContain("bg-accent");
  });

  it("keeps dashboard content contained instead of creating its own scroll region", () => {
    const { container } = render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(container.firstElementChild?.className).toContain("min-h-0");
    expect(container.firstElementChild?.className).toContain("overflow-hidden");
    expect(container.firstElementChild?.className).not.toContain("overflow-y-auto");
  });

  it("shows the last sync value when lastSyncAt is provided", () => {
    const lastSyncAt = "2026-08-10T21:00:00.000Z";
    const stats: DashboardStats = {
      ...defaultStats,
      lastSyncAt,
    };

    render(<Dashboard stats={stats} agents={defaultAgents} />);

    expect(screen.queryByText(new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(lastSyncAt)))).not.toBeNull();
    expect(screen.queryByText(lastSyncAt)).toBeNull();
    expect(screen.queryByText("Last sync")).not.toBeNull();
  });

  it("shows Nunca for the sync card when lastSyncAt is missing", () => {
    setLocale("es");
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.queryByText("Nunca")).not.toBeNull();
    expect(screen.queryByText("Última sincronización")).not.toBeNull();
  });

  it("does not reuse the last backup timestamp for the sync card", () => {
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    // defaultStats.lastBackup is a timestamp, not "Never": the sync card must
    // render its own fallback instead of reusing that backup timestamp.
    expect(screen.queryByText("Never")).not.toBeNull();
    expect(screen.queryByText(defaultStats.lastBackup)).not.toBeNull();
    expect(screen.queryByText("Last sync")).not.toBeNull();
    expect(screen.queryByText("Last backup")).not.toBeNull();
  });

});
