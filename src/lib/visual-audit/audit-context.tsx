"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
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

const AuditNotificationContext = createContext<AuditNotificationContextValue | null>(null);

export function AuditNotificationProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuditNotificationContextValue>(
    () => ({
      notifications: AUDIT_FIXTURE_NOTIFICATIONS,
      unreadCount: 0,
      push: useCallback((_draft: NotificationDraft): string => "audit-noop", []),
      resolve: useCallback((_id: string, _outcome: "success" | "error", _message: string) => {}, []),
      dismiss: useCallback((_id: string) => {}, []),
      markAllRead: useCallback(() => {}, []),
    }),
    [],
  );

  return (
    <AuditNotificationContext.Provider value={value}>
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
