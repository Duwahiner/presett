"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Notification, NotificationDraft } from "@/services/notificationService";
import { AUDIT_FIXTURE_NOTIFICATIONS } from "./fixtures";

// ─── Audit Mode Context ──────────────────────────────────────────────────────

const AuditModeContext = createContext<boolean>(false);

export function AuditModeProvider({
  isAuditMode,
  children,
}: {
  isAuditMode: boolean;
  children: ReactNode;
}) {
  const value = useMemo(() => isAuditMode, [isAuditMode]);
  return (
    <AuditModeContext.Provider value={value}>
      {children}
    </AuditModeContext.Provider>
  );
}

export function useAuditMode(): boolean {
  return useContext(AuditModeContext);
}

// ─── Audit Notification Provider ─────────────────────────────────────────────
// Mutation-safe: push/resolve/dismiss/markAllRead are all no-ops.
// Only returns fixture notifications.

export interface AuditNotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  push(_draft: NotificationDraft): string;
  resolve(_id: string, _outcome: "success" | "error", _message: string): void;
  dismiss(_id: string): void;
  markAllRead(): void;
}

function auditPush(_draft: NotificationDraft): string {
  return "audit-noop";
}

function auditResolve(
  _id: string,
  _outcome: "success" | "error",
  _message: string,
): void {}

function auditDismiss(_id: string): void {}

function auditMarkAllRead(): void {}

const AUDIT_NOTIFICATION_VALUE: AuditNotificationContextValue = {
  notifications: AUDIT_FIXTURE_NOTIFICATIONS,
  unreadCount: 0,
  push: auditPush,
  resolve: auditResolve,
  dismiss: auditDismiss,
  markAllRead: auditMarkAllRead,
};

const AuditNotificationContext = createContext<AuditNotificationContextValue | null>(null);

export function AuditNotificationProvider({ children }: { children: ReactNode }) {
  return (
    <AuditNotificationContext.Provider value={AUDIT_NOTIFICATION_VALUE}>
      {children}
    </AuditNotificationContext.Provider>
  );
}

export function useAuditNotifications(): AuditNotificationContextValue {
  const ctx = useContext(AuditNotificationContext);
  if (!ctx) {
    throw new Error("useAuditNotifications must be used within AuditNotificationProvider");
  }
  return ctx;
}
