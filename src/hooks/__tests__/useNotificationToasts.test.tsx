import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { NotificationProvider } from "@/contexts/notificationContext";
import { useNotificationToasts } from "../useNotificationToasts";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
});
