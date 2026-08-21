export interface DashboardStats {
  modelCount: number;
  profileCount: number;
  backupCount: number;
  lastSync: string;
  gentleAiVersion?: string;
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
