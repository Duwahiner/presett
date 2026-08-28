import { Loader2 } from "lucide-react";

export function FloatingLoadingIndicator({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 border border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)]"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
