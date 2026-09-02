import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { NotificationProvider } from "@/contexts/notificationContext";
import { BellButton } from "@/components/notifications/bellButton";
import { NotificationItem } from "@/components/notifications/notificationItem";
import { NotificationPanel } from "@/components/notifications/notificationPanel";
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

  it("keeps SSR markup stable and hydrates the badge from storage", async () => {
    svc.push({ severity: "error", title: "E", message: "m1" });
    const tree = (
      <NotificationProvider>
        <BellButton open={false} onToggle={() => {}} />
      </NotificationProvider>
    );
    const serverMarkup = renderToString(tree);
    const container = document.createElement("div");
    container.innerHTML = serverMarkup;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    hydrateRoot(container, tree);

    expect(container.textContent).not.toContain("1");
    await waitFor(() => expect(container.textContent).toContain("1"));
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("hydration"),
    );
    consoleError.mockRestore();
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
    render(<NotificationPanel />, { wrapper });

    expect(screen.getByText("// NOTIFICATIONS")).not.toBeNull();
    expect(screen.getByText("No notifications yet.")).not.toBeNull();
  });

  it("renders notification items when they exist", () => {
    svc.push({ severity: "error", title: "Error One", message: "msg1" });
    svc.push({ severity: "update", title: "Update Available", message: "msg2" });

    render(<NotificationPanel />, { wrapper });

    expect(screen.getByText("Error One")).not.toBeNull();
    expect(screen.getByText("Update Available")).not.toBeNull();
  });
});
