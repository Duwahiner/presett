import type { BackupInfo } from "./BackupsClient.types";

export interface BackupsFilterState {
  search: string;
  activeFilters: Record<string, string>;
  sortField: string;
  sortDir: "asc" | "desc";
}

export function filterAndSortBackups(
  backups: BackupInfo[],
  state: BackupsFilterState,
): BackupInfo[] {
  const { search, activeFilters, sortField, sortDir } = state;
  const searchLower = search.toLowerCase();
  const showPinnedOnly = activeFilters.pinned === "true";

  const filtered = backups.filter((b) => {
    if (searchLower) {
      const matchesId = b.id.toLowerCase().includes(searchLower);
      const matchesSource = b.source.toLowerCase().includes(searchLower);
      if (!matchesId && !matchesSource) return false;
    }
    if (showPinnedOnly && !b.pinned) return false;
    return true;
  });

  const dir = sortDir === "asc" ? 1 : -1;

  return [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "size":
        cmp = (a.size - b.size) * dir;
        break;
      case "fileCount":
        cmp = (a.fileCount - b.fileCount) * dir;
        break;
      case "timestamp":
      default:
        cmp = (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * dir;
        break;
    }
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });
}
