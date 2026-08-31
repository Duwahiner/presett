import { DashboardView } from "./dashboardView";
import type { DashboardProps } from "./dashboardTypes";

export function Dashboard(props: DashboardProps) {
  return <DashboardView {...props} />;
}
