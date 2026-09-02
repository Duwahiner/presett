import { Spinner } from "@/components/ui/spinner";

/**
 * Section-scoped loading status indicator, centered horizontally just above
 * the associated section. Pure status display: not an actionable button and
 * never an overlay. The wrapper is non-blocking (pointer-events-none) and does
 * not cover or dim the section beneath it.
 */
export function LoadingIndicator({ label }: { label: string }) {
  return (
    <div className="pointer-events-none flex justify-center">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="m-[12px] flex h-8 w-fit items-center gap-2 border border-border bg-card px-3 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)]"
      >
        <Spinner aria-hidden="true" className="size-4 text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}