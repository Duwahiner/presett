import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

/** Compact disabled control for API sub-states. */
export function LoadingButton({ label = "Cargando…" }: { label?: string }) {
  return (
    <Button
      disabled
      size="sm"
      className="rounded-xl bg-muted-foreground text-background disabled:opacity-100"
    >
      <Spinner data-icon="inline-start" aria-hidden="true" />
      {label}
    </Button>
  );
}
