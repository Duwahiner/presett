"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import { t } from "@/resources/resources";
import { NotificationItem } from "./NotificationItem";

export function NotificationPanel() {
  const { notifications, dismiss } = useNotifications();

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          // NOTIFICATIONS
        </h2>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label={t("notif_panel_title")}
        className="max-h-[400px] overflow-y-auto p-3 scrollbar-brutal"
      >
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
  );
}
