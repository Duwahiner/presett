"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/notificationContext";
import { hasNotifiedUpdate, markUpdateNotified } from "@/services/notificationService";

export function useNotificationToasts() {
  const { notifications, unreadCount, push, resolve, dismiss, markAllRead } =
    useNotifications();

  const onError = useCallback(
    (title: string, message: string): string => {
      const id = push({ severity: "error", title, message });
      toast.error(message);
      return id;
    },
    [push],
  );

  const onSuccess = useCallback(
    (message: string) => {
      toast.success(message);
    },
    [],
  );

  const onInfo = useCallback(
    (title: string, message: string): string => {
      return push({ severity: "info", title, message, inProgress: true });
    },
    [push],
  );

  const onUpdate = useCallback(
    (
      title: string,
      message: string,
      notice: { version: string; channel: string },
    ): string | null => {
      // Semantic dedupe across reloads and components (dashboard + diagnostics).
      if (hasNotifiedUpdate(notice.version, notice.channel)) return null;
      markUpdateNotified(notice.version, notice.channel);
      const id = push({ severity: "update", title, message });
      toast.info(message);
      return id;
    },
    [push],
  );

  return {
    notifications,
    unreadCount,
    push,
    resolve,
    dismiss,
    markAllRead,
    onError,
    onSuccess,
    onInfo,
    onUpdate,
  };
}
