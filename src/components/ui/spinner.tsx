import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Primitive spinner icon. Use this inside buttons, badges, or any inline context. */
export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

/** Full-section centered loading state. Use this when an entire data region is fetching. */
export function SectionSpinner({ label = "Cargando..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3"
    >
      <Spinner aria-hidden="true" className="size-7 text-primary" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
