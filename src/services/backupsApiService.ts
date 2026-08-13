import { get, post } from "./api";

export interface BackupInfo {
  id: string;
  source: string;
  timestamp: string;
  fileCount: number;
  size: number;
  pinned: boolean;
}

export interface SyncResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function listBackups(): Promise<{ backups: BackupInfo[] }> {
  return get("/backups");
}

export async function runSync(): Promise<SyncResult> {
  return post("/sync");
}

export async function restoreBackup(
  id: string,
  options?: { confirmed?: true },
): Promise<void> {
  return post(`/backups/${id}`, {
    action: "restore",
    ...(options?.confirmed ? { confirmed: true } : {}),
  });
}

export async function pinBackup(id: string): Promise<void> {
  return post(`/backups/${id}`, { action: "pin" });
}

export async function unpinBackup(id: string): Promise<void> {
  return post(`/backups/${id}`, { action: "unpin" });
}

export async function deleteBackup(
  id: string,
  options?: { confirmed?: true },
): Promise<void> {
  return post(`/backups/${id}`, {
    action: "delete",
    ...(options?.confirmed ? { confirmed: true } : {}),
  });
}
