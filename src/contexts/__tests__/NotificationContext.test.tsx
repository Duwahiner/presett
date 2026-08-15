import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { NotificationProvider, useNotifications } from "@/contexts/NotificationContext";

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("useNotifications", () => {
  it("returns empty notifications and zero unreadCount initially", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("push adds a notification and increments unreadCount", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    let id: string;
    act(() => {
      id = result.current.push({
        severity: "error",
        title: "Error",
        message: "Something failed.",
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications[0].id).toBe(id!);
  });

  it("dismiss removes a notification and updates unreadCount", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    let id: string;
    act(() => {
      id = result.current.push({
        severity: "error",
        title: "Error",
        message: "msg",
      });
    });

    act(() => {
      result.current.dismiss(id!);
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it("markAllRead sets all to read and resets unreadCount", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.push({ severity: "error", title: "E", message: "m1" });
      result.current.push({ severity: "update", title: "U", message: "m2" });
    });

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(
      result.current.notifications.every((n) => n.status === "read"),
    ).toBe(true);
  });

  it("resolve updates an in-progress notification", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    let id: string;
    act(() => {
      id = result.current.push({
        severity: "info",
        title: "Working",
        message: "Please wait…",
        inProgress: true,
      });
    });

    act(() => {
      result.current.resolve(id!, "success", "Done!");
    });

    const resolved = result.current.notifications.find((n) => n.id === id!);
    expect(resolved?.message).toBe("Done!");
    expect(resolved?.inProgress).toBe(false);
  });
});
