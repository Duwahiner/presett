import { DashboardLayoutView } from "./DashboardLayout.view";
import type { DashboardLayoutProps } from "./DashboardLayout.types";

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardLayoutView>{children}</DashboardLayoutView>;
}
