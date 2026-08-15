"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/contexts/NotificationContext";
import { t } from "@/resources/resources";

interface BellButtonProps {
  open: boolean;
  onToggle: () => void;
}

export function BellButton({ open, onToggle }: BellButtonProps) {
  const { unreadCount } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("topbar_notifications_aria")}
      aria-expanded={open}
      onClick={onToggle}
      className="relative"
    >
      <Bell className="size-[18px]" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
