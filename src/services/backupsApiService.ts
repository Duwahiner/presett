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
