"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/contexts/NotificationContext";
import { t } from "@/resources/resources";
import { NotificationItem } from "./NotificationItem";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { notifications, markAllRead, dismiss } = useNotifications();

  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{t("notif_panel_title")}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("topbar_menu_close_aria")}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("notif_panel_empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
