import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { type ReactNode } from "react";
import { NotificationProvider } from "@/contexts/notificationContext";
import { NotificationItem } from "@/components/notifications/notificationItem";
import { NotificationPanel } from "@/components/notifications/notificationPanel";
import type { Notification } from "@/services/notificationService";

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("NotificationItem — spinner + accessibility", () => {
  it("renders spinner when inProgress, icon when not", () => {
    const inProgress: Notification = {
      id: "1", severity: "info", title: "Syncing", message: "Wait…",
      status: "unread", inProgress: true, createdAt: new Date().toISOString(),
    };
    const done: Notification = {
      id: "2", severity: "info", title: "Done", message: "Complete.",
      status: "read", inProgress: false, createdAt: new Date().toISOString(),
    };

    const { rerender } = render(<NotificationItem notification={inProgress} />, { wrapper });
    expect(screen.getByRole("status")).not.toBeNull();
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Loading");

    rerender(<NotificationItem notification={done} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Done")).not.toBeNull();
  });
});

describe("NotificationPanel — a11y attributes", () => {
  it("has role=log and aria-live=polite on list", () => {
    render(<NotificationPanel />, { wrapper });
    const log = screen.getByRole("log");
    expect(log).not.toBeNull();
    expect(log.getAttribute("aria-live")).toBe("polite");
  });

  it("panel renders with NOTIFICATIONS header", () => {
    render(<NotificationPanel />, { wrapper });
    expect(screen.getByText("// NOTIFICATIONS")).not.toBeNull();
  });
});
