"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/notificationContext";

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
  };
}
