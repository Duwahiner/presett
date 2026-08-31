import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Primitive spinner icon. Use this inside buttons, badges, or any inline context. */
export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}