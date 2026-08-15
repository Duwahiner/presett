import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  init,
  push,
  getAll,
  STORAGE_KEY,
  MAX_ENTRIES,
  TTL_MS,
} from "@/services/notificationService";

beforeEach(() => {
  localStorage.clear();
});

describe("NotificationService — init", () => {
  it("prunes expired entries when called", () => {
    // Seed expired entry
    const expiredDate = new Date(Date.now() - TTL_MS - 1).toISOString();
    const entries = [
      {
        id: "expired-1",
        severity: "error",
        title: "Old",
        message: "old msg",
        status: "unread",
        inProgress: false,
        createdAt: expiredDate,
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    expect(getAll()).toHaveLength(1);

    init();

    expect(getAll()).toHaveLength(0);
  });

  it("enforces cap when called", () => {
    const entries = Array.from({ length: MAX_ENTRIES + 5 }, (_, i) => ({
      id: `entry-${i}`,
      severity: "info" as const,
      title: `N${i}`,
      message: `msg ${i}`,
      status: "unread" as const,
      inProgress: false,
      createdAt: new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    expect(getAll()).toHaveLength(MAX_ENTRIES + 5);

    init();

    expect(getAll()).toHaveLength(MAX_ENTRIES);
  });

  it("is idempotent — calling twice does not double-prune", () => {
    push({ severity: "error", title: "E", message: "m" });

    init();
    init();

    expect(getAll()).toHaveLength(1);
  });
});
