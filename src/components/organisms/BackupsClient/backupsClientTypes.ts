import type { BackupDetail } from "@/services/backupsApiService";

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
  syncing: boolean;
  pendingAction: string | null;
  detailBackup: BackupInfo | null;
  backupDetail: BackupDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onSync: () => void;
  onRestore: (id: string, name: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
  onDetailClose: () => void;
  deleteConfirmId: string | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}
