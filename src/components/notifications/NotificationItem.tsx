"use client";

import { X, AlertCircle, Info, CheckCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/resources/resources";
import type { Notification } from "@/services/notificationService";

const severityConfig: Record<
  Notification["severity"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  error: { icon: AlertCircle, color: "text-destructive" },
  success: { icon: CheckCircle, color: "text-success" },
  update: { icon: Bell, color: "text-primary" },
  info: { icon: Info, color: "text-muted-foreground" },
};

interface NotificationItemProps {
  notification: Notification;
  onDismiss?: (id: string) => void;
}

export function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const { icon: Icon, color } = severityConfig[notification.severity];

  return (
    <div
      className={cn(
        "flex items-start gap-3 border border-border p-3 transition-colors",
        notification.status === "unread" && "bg-accent/50",
      )}
    >
      {notification.inProgress ? (
        <span
          role="status"
          aria-label="Loading"
          className="mt-0.5 size-4 shrink-0 animate-spin"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      ) : (
        <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label={t("notif_item_dismiss_aria")}
          className="shrink-0 cursor-pointer p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => onDismiss(notification.id)}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
