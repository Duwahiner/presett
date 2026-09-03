export interface DashboardStats {
  modelCount: number;
  profileCount: number;
  backupCount: number;
  lastBackup: string;
}

export interface DashboardAgent {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}

export interface DashboardProps {
  className?: string;
  stats: DashboardStats;
  agents: DashboardAgent[];
}
