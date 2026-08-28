import { Spinner } from "@/components/ui/spinner";

export function FloatingLoadingIndicator({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={label}
      title={label}
      className="fixed bottom-5 right-5 z-50 flex size-9 items-center justify-center rounded-full bg-card/95 text-primary shadow-lg backdrop-blur-sm"
    >
      <Spinner aria-hidden="true" className="size-5" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
