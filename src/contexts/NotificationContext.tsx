"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Notification,
  type NotificationDraft,
  getAll as svcGetAll,
  getUnreadCount as svcUnread,
  push as svcPush,
  resolve as svcResolve,
  dismiss as svcDismiss,
  markAllRead as svcMarkAllRead,
} from "@/services/notificationService";

export interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  push(draft: NotificationDraft): string;
  resolve(id: string, outcome: "success" | "error", message: string): void;
  dismiss(id: string): void;
  markAllRead(): void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const notifications = useMemo(() => svcGetAll(), [tick]);
  const unreadCount = useMemo(() => svcUnread(), [tick]);

  const push = useCallback(
    (draft: NotificationDraft): string => {
      const id = svcPush(draft);
      refresh();
      return id;
    },
    [refresh],
  );

  const resolve = useCallback(
    (id: string, outcome: "success" | "error", message: string) => {
      svcResolve(id, outcome, message);
      refresh();
    },
    [refresh],
  );

  const dismiss = useCallback(
    (id: string) => {
      svcDismiss(id);
      refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(() => {
    svcMarkAllRead();
    refresh();
  }, [refresh]);

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, push, resolve, dismiss, markAllRead }),
    [notifications, unreadCount, push, resolve, dismiss, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
