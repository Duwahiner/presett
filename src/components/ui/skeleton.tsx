import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
