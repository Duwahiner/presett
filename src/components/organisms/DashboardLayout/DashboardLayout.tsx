import { DashboardLayoutView } from "./DashboardLayout.view";
import type { DashboardLayoutProps } from "./DashboardLayout.types";

export function DashboardLayout({ children, gentleAiVersion }: DashboardLayoutProps) {
  return <DashboardLayoutView gentleAiVersion={gentleAiVersion}>{children}</DashboardLayoutView>;
}
