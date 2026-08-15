import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { type ReactNode } from "react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
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
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    const log = screen.getByRole("log");
    expect(log).not.toBeNull();
    expect(log.getAttribute("aria-live")).toBe("polite");
  });

  it("close button is focusable", () => {
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    const btn = screen.getByRole("button", { name: /close/i });
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("tabindex")).not.toBe("-1");
  });

  it("traps Tab focus inside panel when open", () => {
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    const panel = screen.getByRole("dialog", { name: /notifications/i });
    const closeBtn = screen.getByRole("button", { name: /close/i });

    // Focus should start on the first focusable element (close button)
    expect(document.activeElement).toBe(closeBtn);

    // Tab from last element should wrap to first
    fireEvent.keyDown(document, { key: "Tab" });
    // After Tab, focus should still be within the panel (wrapped)
    expect(panel.contains(document.activeElement)).toBe(true);

    // Shift+Tab from first element should wrap to last
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it("panel has role=dialog and aria-label", () => {
    render(<NotificationPanel open={true} onClose={() => {}} />, { wrapper });
    const dialog = screen.getByRole("dialog", { name: /notifications/i });
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-label")).toBeTruthy();
  });
});
