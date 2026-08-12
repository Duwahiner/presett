import { Badge as UIBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BadgeProps, BadgeVariant } from "./Badge.types";

export function mapBadgeVariant(
  variant?: BadgeVariant,
): "default" | "secondary" | "destructive" | "outline" {
  switch (variant) {
    case "success":
      return "secondary";
    case "warning":
      return "outline";
    case "error":
      return "destructive";
    case "info":
    default:
      return "default";
  }
}

export function Badge({
  children,
  variant = "info",
  pulsing = false,
  className,
}: BadgeProps) {
  return (
    <UIBadge
      variant={mapBadgeVariant(variant)}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      {pulsing && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {children}
    </UIBadge>
  );
}
