import { DashboardView } from "./Dashboard.view";
import type { DashboardProps } from "./Dashboard.types";

export function Dashboard(props: DashboardProps) {
  return <DashboardView {...props} />;
}
