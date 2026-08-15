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
        "flex items-start gap-3 rounded-xl border border-border p-3 transition-colors",
        notification.status === "unread" && "bg-accent/50",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label={t("notif_item_dismiss_aria")}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => onDismiss(notification.id)}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
