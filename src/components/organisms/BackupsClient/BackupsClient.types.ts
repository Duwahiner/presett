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
  onRestore: (id: string) => void;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
  restoreConfirmId: string | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onRestoreConfirm: () => void;
  onRestoreCancel: () => void;
}
