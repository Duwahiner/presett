export interface BackupInfo {
  id: string;
  source: string;
  timestamp: string;
  fileCount: number;
  size: number;
  pinned: boolean;
}

export interface BackupsClientViewProps {
  backups: BackupInfo[];
  loading: boolean;
  error: string | null;
  syncOutput: string | null;
  onSync: () => void;
}
