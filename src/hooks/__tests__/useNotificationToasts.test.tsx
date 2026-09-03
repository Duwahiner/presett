import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { NotificationProvider } from "@/contexts/notificationContext";
import { useNotificationToasts } from "../useNotificationToasts";
import { hasNotifiedUpdate, markUpdateNotified } from "@/services/notificationService";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useNotificationToasts", () => {
  it("error: pushes notification and shows error toast", () => {
    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    act(() => {
      result.current.onError("Backup failed", "Sync error");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].severity).toBe("error");
    expect(result.current.notifications[0].message).toBe("Sync error");
    expect(toast.error).toHaveBeenCalledWith("Sync error");
  });

  it("error: sanitizes message before storing", () => {
    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    act(() => {
      result.current.onError("Backup failed", "Error at C:\\Users\\test\\file.ts:42");
    });

    expect(result.current.notifications[0].message).not.toContain("C:\\Users");
    expect(toast.error).toHaveBeenCalled();
  });

  it("success: shows toast without persisting notification", () => {
    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    act(() => {
      result.current.onSuccess("Sync completed.");
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith("Sync completed.");
  });

  it("error returns notification id for resolve", () => {
    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    let id: string = "";
    act(() => {
      id = result.current.onError("Failed", "msg");
    });

    expect(id).toBeTruthy();
    expect(result.current.notifications.find((n) => n.id === id)).toBeTruthy();
  });

  it("update: persists an update notification and shows an info toast", () => {
    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    let id: string | null = null;
    act(() => {
      id = result.current.onUpdate(
        "Gentle AI 1.3.0 is ready to install.",
        "Gentle-AI 1.3.0 is available on stable.",
        { version: "1.3.0", channel: "stable" },
      );
    });

    expect(id).toBeTruthy();
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].severity).toBe("update");
    expect(toast.info).toHaveBeenCalledWith("Gentle-AI 1.3.0 is available on stable.");
  });

  it("update: dedupes the same version+channel across calls", () => {
    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    let first: string | null = null;
    let second: string | null = null;
    act(() => {
      first = result.current.onUpdate("t", "Gentle-AI 1.3.0 available.", { version: "1.3.0", channel: "stable" });
      second = result.current.onUpdate("t", "Gentle-AI 1.3.0 available.", { version: "1.3.0", channel: "stable" });
    });

    expect(first).toBeTruthy();
    expect(second).toBeNull();
    expect(result.current.notifications).toHaveLength(1);
    expect(toast.info).toHaveBeenCalledTimes(1);
  });

  it("update: does not suppress a genuinely newer release", () => {
    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    let older: string | null = null;
    let newer: string | null = null;
    act(() => {
      older = result.current.onUpdate("t", "1.3.0 available.", { version: "1.3.0", channel: "stable" });
      newer = result.current.onUpdate("t", "1.4.0 available.", { version: "1.4.0", channel: "stable" });
    });

    expect(older).toBeTruthy();
    expect(newer).toBeTruthy();
    expect(result.current.notifications).toHaveLength(2);
    expect(toast.info).toHaveBeenCalledTimes(2);
  });

  it("update: respects dedupe that is already persisted (across remounts/reloads)", () => {
    // Simulate a prior session/component having notified for this release.
    act(() => markUpdateNotified("2.0.0", "rc"));

    const { result } = renderHook(() => useNotificationToasts(), { wrapper });

    let id: string | null = null;
    act(() => {
      id = result.current.onUpdate("t", "2.0.0 rc available.", { version: "2.0.0", channel: "rc" });
    });

    expect(id).toBeNull();
    expect(hasNotifiedUpdate("2.0.0", "rc")).toBe(true);
    expect(result.current.notifications).toHaveLength(0);
    expect(toast.info).not.toHaveBeenCalled();
  });
});
