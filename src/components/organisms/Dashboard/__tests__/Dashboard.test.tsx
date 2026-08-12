import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "@/components/organisms/Dashboard/Dashboard";
import { t, setLocale } from "@/resources/resources";
import type { DashboardStats } from "@/components/organisms/Dashboard/Dashboard.types";

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
  lastSync: "2026-08-10T20:00:00Z",
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
    expect(screen.queryByText(defaultStats.lastSync)).not.toBeNull();
  });

  it("renders different stat values from props", () => {
    const stats: DashboardStats = {
      modelCount: 12,
      profileCount: 7,
      backupCount: 99,
      lastSync: "Yesterday",
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

  it("renders links to each management page", () => {
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.queryByRole("link", { name: /configure models/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /switch sdd profile/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /restore backup/i })).not.toBeNull();
  });

  it("renders translated Spanish text when locale is es", () => {
    setLocale("es");
    render(<Dashboard stats={defaultStats} agents={defaultAgents} />);

    expect(screen.queryByText(t("dashboard_title"))).not.toBeNull();
    expect(screen.queryByText(t("dashboard_stat_models_label"))).not.toBeNull();
    expect(screen.queryByText(t("dashboard_stat_profiles_label"))).not.toBeNull();
    expect(screen.queryByText(t("dashboard_stat_backups_label"))).not.toBeNull();
  });
});
