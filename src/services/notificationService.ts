export type NotificationSeverity = "error" | "success" | "update" | "info";

export interface Notification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  status: "unread" | "read";
  inProgress: boolean;
  createdAt: string;
}

export type NotificationDraft = Omit<
  Notification,
  "id" | "status" | "createdAt" | "inProgress"
> & {
  inProgress?: boolean;
};

export const STORAGE_KEY = "presett_notifications";
export const MAX_ENTRIES = 100;
export const TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const UPDATE_NOTIFIED_KEY = "presett_notified_updates";

const WIN_PATH_REGEX = /[A-Za-z]:\\(?:[\w.-]+\\)*[\w.-]+\.\w+(?::\d+)?/g;
const NIX_PATH_REGEX = /\/(?:[\w.-]+\/)*[\w.-]+\.\w+(?::\d+)?/g;
const STACK_TRACE_REGEX = /\n\s*at\s+.*/g;

function sanitize(raw: string): string {
  return raw
    .replace(STACK_TRACE_REGEX, "")
    .replace(WIN_PATH_REGEX, "")
    .replace(NIX_PATH_REGEX, "")
    .trim();
}

function readStore(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Notification[]) : [];
  } catch {
    return [];
  }
}

function writeStore(entries: Notification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function prune(): void {
  const now = Date.now();
  const entries = readStore();
  const alive = entries.filter(
    (n) => now - new Date(n.createdAt).getTime() < TTL_MS,
  );
  if (alive.length > MAX_ENTRIES) {
    alive.splice(0, alive.length - MAX_ENTRIES);
  }
  writeStore(alive);
}

export function push(draft: NotificationDraft): string {
  prune();
  const id = crypto.randomUUID();
  const entry: Notification = {
    id,
    severity: draft.severity,
    title: draft.title,
    message: sanitize(draft.message),
    status: "unread",
    inProgress: draft.inProgress ?? false,
    createdAt: new Date().toISOString(),
  };
  const entries = readStore();
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  writeStore(entries);
  return id;
}

export function resolve(
  id: string,
  _outcome: "success" | "error",
  message: string,
): void {
  const entries = readStore();
  const idx = entries.findIndex((n) => n.id === id);
  if (idx === -1) return;
  entries[idx].message = sanitize(message);
  entries[idx].inProgress = false;
  writeStore(entries);
}

export function dismiss(id: string): void {
  const entries = readStore().filter((n) => n.id !== id);
  writeStore(entries);
}

export function markAllRead(): void {
  const entries = readStore().map((n) => ({ ...n, status: "read" as const }));
  writeStore(entries);
}

export function getAll(): Notification[] {
  return readStore();
}

function updateKey(version: string, channel: string): string {
  return `${version}|${channel}`;
}

function readNotifiedUpdates(): string[] {
  try {
    const raw = localStorage.getItem(UPDATE_NOTIFIED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Semantic dedupe for release update notifications. The key is the exact
 * (version, channel) pair, so a genuinely newer release (different version or
 * channel) is never suppressed. Persisted across reloads and shared between
 * the dashboard and diagnostics clients.
 */
export function hasNotifiedUpdate(version: string, channel: string): boolean {
  return readNotifiedUpdates().includes(updateKey(version, channel));
}

export function markUpdateNotified(version: string, channel: string): void {
  const key = updateKey(version, channel);
  const list = readNotifiedUpdates();
  if (!list.includes(key)) {
    list.push(key);
    localStorage.setItem(UPDATE_NOTIFIED_KEY, JSON.stringify(list));
  }
}

export function getUnreadCount(): number {
  return readStore().filter((n) => n.status === "unread").length;
}

export function init(): void {
  prune();
}
