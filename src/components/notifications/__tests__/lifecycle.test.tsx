import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { NotificationProvider, useNotifications } from "@/contexts/NotificationContext";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import * as svc from "@/services/notificationService";

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("Integration — severity display + lifecycle + panel", () => {
  it("error notification shows in panel", () => {
    svc.push({ severity: "error", title: "Sync Failed", message: "Backup error." });
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    expect(screen.getByText("Sync Failed")).not.toBeNull();
  });

  it("update notification shows version in panel", () => {
    svc.push({ severity: "update", title: "Update available", message: "Gentle AI v2.1.0 is ready to install." });
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    expect(screen.getByText("Gentle AI v2.1.0 is ready to install.")).not.toBeNull();
  });

  it("info notification shows spinner when inProgress", () => {
    svc.push({ severity: "info", title: "Syncing", message: "Please wait…", inProgress: true });
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    expect(screen.getByRole("status")).not.toBeNull();
  });

  it("lifecycle: push creates inProgress, resolve updates it", () => {
    function Harness() {
      const { notifications, push, resolve } = useNotifications();
      return (
        <div>
          <button data-testid="start" onClick={() => push({ severity: "info", title: "Syncing", message: "Starting…", inProgress: true })}>Start</button>
          <button data-testid="resolve" onClick={() => {
            const e = notifications.find((n) => n.severity === "info" && n.inProgress);
            if (e) resolve(e.id, "success", "Sync complete.");
          }}>Resolve</button>
          {notifications.map((n) => (
            <div key={n.id}>
              <span data-testid={`progress-${n.id}`}>{n.inProgress ? "loading" : "done"}</span>
              <span data-testid={`msg-${n.id}`}>{n.message}</span>
            </div>
          ))}
        </div>
      );
    }
    render(<Harness />, { wrapper });
    act(() => { fireEvent.click(screen.getByTestId("start")); });
    expect(screen.getAllByText("loading").length).toBeGreaterThanOrEqual(1);
    act(() => { fireEvent.click(screen.getByTestId("resolve")); });
    expect(screen.getAllByText("done").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sync complete.")).not.toBeNull();
  });

  it("panel: opens, marks read, closes on Escape", () => {
    svc.push({ severity: "error", title: "Error", message: "msg" });
    expect(svc.getUnreadCount()).toBe(1);
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button data-testid="open" onClick={() => setOpen(true)}>Open</button>
          <NotificationPanel open={open} onClose={() => setOpen(false)} />
        </div>
      );
    }
    render(<Harness />, { wrapper });
    act(() => { fireEvent.click(screen.getByTestId("open")); });
    expect(screen.getByText("Error")).not.toBeNull();
    expect(svc.getUnreadCount()).toBe(0);
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(screen.queryByText("Error")).toBeNull();
  });

  it("panel: empty state when no notifications", () => {
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    expect(screen.getByText("No notifications yet.")).not.toBeNull();
  });

  it("panel: dismiss removes entry", () => {
    svc.push({ severity: "error", title: "ToRemove", message: "msg" });
    function Harness() {
      const { dismiss, notifications } = useNotifications();
      return (
        <div>
          <NotificationPanel open={true} onClose={() => {}} />
          <button data-testid="dismiss" onClick={() => { if (notifications.length > 0) dismiss(notifications[0].id); }}>Dismiss</button>
        </div>
      );
    }
    render(<Harness />, { wrapper });
    expect(screen.getByText("ToRemove")).not.toBeNull();
    act(() => { fireEvent.click(screen.getByTestId("dismiss")); });
    expect(screen.queryByText("ToRemove")).toBeNull();
  });
});
