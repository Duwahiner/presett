import { describe, it, expect, beforeEach } from "vitest";
import {
  push,
  resolve,
  dismiss,
  markAllRead,
  getAll,
  getUnreadCount,
  prune,
  STORAGE_KEY,
  MAX_ENTRIES,
  TTL_MS,
} from "@/services/notificationService";

beforeEach(() => {
  localStorage.clear();
});

describe("push", () => {
  it("stores a notification and returns its id", () => {
    const id = push({
      severity: "error",
      title: "Sync failed",
      message: "Backup sync could not complete.",
    });

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const all = getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(id);
    expect(all[0].severity).toBe("error");
    expect(all[0].status).toBe("unread");
    expect(all[0].createdAt).toBeTruthy();
  });

  it("defaults inProgress to false", () => {
    const id = push({
      severity: "info",
      title: "Working",
      message: "Please wait.",
    });

    const all = getAll();
    expect(all[0].inProgress).toBe(false);
  });
});

describe("resolve", () => {
  it("updates message and clears inProgress on success", () => {
    const id = push({
      severity: "info",
      title: "Syncing",
      message: "Starting sync…",
      inProgress: true,
    });

    resolve(id, "success", "Sync completed.");

    const all = getAll();
    expect(all[0].message).toBe("Sync completed.");
    expect(all[0].inProgress).toBe(false);
  });

  it("updates message and clears inProgress on error", () => {
    const id = push({
      severity: "info",
      title: "Restoring",
      message: "Restoring backup…",
      inProgress: true,
    });

    resolve(id, "error", "Restore failed.");

    const all = getAll();
    expect(all[0].message).toBe("Restore failed.");
    expect(all[0].inProgress).toBe(false);
  });
});

describe("dismiss", () => {
  it("removes a notification by id", () => {
    const id = push({
      severity: "error",
      title: "Error",
      message: "Something went wrong.",
    });

    expect(getAll()).toHaveLength(1);
    dismiss(id);
    expect(getAll()).toHaveLength(0);
  });

  it("does nothing for unknown id", () => {
    push({
      severity: "error",
      title: "Error",
      message: "msg",
    });

    dismiss("nonexistent-id");
    expect(getAll()).toHaveLength(1);
  });
});

describe("markAllRead", () => {
  it("marks all unread notifications as read", () => {
    push({ severity: "error", title: "E1", message: "m1" });
    push({ severity: "update", title: "U1", message: "m2" });

    expect(getUnreadCount()).toBe(2);
    markAllRead();
    expect(getUnreadCount()).toBe(0);

    const all = getAll();
    expect(all.every((n) => n.status === "read")).toBe(true);
  });
});

describe("getUnreadCount", () => {
  it("returns 0 when empty", () => {
    expect(getUnreadCount()).toBe(0);
  });

  it("counts only unread notifications", () => {
    const id = push({ severity: "error", title: "E", message: "m" });
    expect(getUnreadCount()).toBe(1);

    markAllRead();
    expect(getUnreadCount()).toBe(0);

    push({ severity: "info", title: "I", message: "m2" });
    expect(getUnreadCount()).toBe(1);

    dismiss(id);
    expect(getUnreadCount()).toBe(1);
  });
});

describe("prune", () => {
  it("removes expired entries (older than TTL)", () => {
    push({ severity: "error", title: "Old", message: "old msg" });

    // Tamper createdAt to simulate expiry
    const all = getAll();
    const expiredDate = new Date(Date.now() - TTL_MS - 1).toISOString();
    all[0].createdAt = expiredDate;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    prune();
    expect(getAll()).toHaveLength(0);
  });

  it("keeps recent entries", () => {
    push({ severity: "error", title: "Recent", message: "new msg" });
    prune();
    expect(getAll()).toHaveLength(1);
  });

  it("enforces cap of MAX_ENTRIES by removing oldest first", () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i++) {
      push({ severity: "info", title: `N${i}`, message: `msg ${i}` });
    }

    prune();
    expect(getAll()).toHaveLength(MAX_ENTRIES);
  });
});

describe("sanitization", () => {
  it("strips file paths from message", () => {
    const id = push({
      severity: "error",
      title: "Error",
      message: "Failed at C:\\Users\\secret\\file.ts:42",
    });

    const all = getAll();
    expect(all[0].message).not.toContain("C:\\Users");
    expect(all[0].message).not.toContain("secret");
  });

  it("strips unix paths from message", () => {
    const id = push({
      severity: "error",
      title: "Error",
      message: "Error in /home/user/secret/project/index.ts",
    });

    const all = getAll();
    expect(all[0].message).not.toContain("/home/user");
  });

  it("strips stack traces from message", () => {
    const id = push({
      severity: "error",
      title: "Error",
      message: "TypeError: x is not a function\n    at Object.<anonymous> (/src/index.ts:10:5)",
    });

    const all = getAll();
    expect(all[0].message).not.toContain("at Object");
    expect(all[0].message).not.toContain("/src/index.ts");
  });

  it("keeps safe message content intact", () => {
    const id = push({
      severity: "error",
      title: "Sync failed",
      message: "Backup sync could not complete. Try again.",
    });

    const all = getAll();
    expect(all[0].message).toBe("Backup sync could not complete. Try again.");
  });
});

describe("TTL constant", () => {
  it("TTL_MS equals 30 days", () => {
    expect(TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("MAX_ENTRIES constant", () => {
  it("MAX_ENTRIES is 100", () => {
    expect(MAX_ENTRIES).toBe(100);
  });
});
