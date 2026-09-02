import { DashboardLayoutView } from "./dashboardLayoutView";
import type { DashboardLayoutProps } from "./dashboardLayoutTypes";

export function DashboardLayout({ children, gentleAiVersion }: DashboardLayoutProps) {
  return <DashboardLayoutView gentleAiVersion={gentleAiVersion}>{children}</DashboardLayoutView>;
}
