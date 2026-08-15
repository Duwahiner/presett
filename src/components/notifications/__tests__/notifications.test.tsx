import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { type ReactNode } from "react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { BellButton } from "@/components/notifications/BellButton";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import type { Notification } from "@/services/notificationService";
import * as svc from "@/services/notificationService";

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("BellButton", () => {
  it("renders bell icon without badge when no unread notifications", () => {
    render(<BellButton open={false} onToggle={() => {}} />, { wrapper });

    expect(
      screen.getByRole("button", { name: /notifications/i }),
    ).not.toBeNull();
    expect(screen.queryByText("1")).toBeNull();
  });

  it("displays unread count badge when notifications exist", () => {
    svc.push({ severity: "error", title: "E", message: "m1" });
    svc.push({ severity: "update", title: "U", message: "m2" });

    render(<BellButton open={false} onToggle={() => {}} />, { wrapper });

    expect(screen.getByText("2")).not.toBeNull();
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<BellButton open={false} onToggle={onToggle} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("NotificationItem", () => {
  it("renders title and message", () => {
    const notif: Notification = {
      id: "1",
      severity: "error",
      title: "Sync failed",
      message: "Backup sync could not complete.",
      status: "unread",
      inProgress: false,
      createdAt: new Date().toISOString(),
    };

    render(<NotificationItem notification={notif} />, { wrapper });

    expect(screen.getByText("Sync failed")).not.toBeNull();
    expect(
      screen.getByText("Backup sync could not complete."),
    ).not.toBeNull();
  });

  it("shows dismiss button and calls onDismiss when clicked", () => {
    const onDismiss = vi.fn();
    const notif: Notification = {
      id: "1",
      severity: "error",
      title: "Error",
      message: "msg",
      status: "unread",
      inProgress: false,
      createdAt: new Date().toISOString(),
    };

    render(
      <NotificationItem notification={notif} onDismiss={onDismiss} />,
      { wrapper },
    );

    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledWith("1");
  });
});

describe("NotificationPanel", () => {
  it("renders panel header when no notifications", () => {
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });

    expect(screen.getByRole("heading", { name: "Notifications" })).not.toBeNull();
    expect(screen.getByText("No notifications yet.")).not.toBeNull();
  });

  it("renders notification items when they exist", () => {
    svc.push({ severity: "error", title: "Error One", message: "msg1" });
    svc.push({ severity: "update", title: "Update Available", message: "msg2" });

    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });

    expect(screen.getByText("Error One")).not.toBeNull();
    expect(screen.getByText("Update Available")).not.toBeNull();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<NotificationPanel open={true} onClose={onClose} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
