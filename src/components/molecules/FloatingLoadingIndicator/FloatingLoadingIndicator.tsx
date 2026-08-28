import { Spinner } from "@/components/ui/spinner";

export function FloatingLoadingIndicator({ label }: { label: string }) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={label}
      className="fixed bottom-6 right-6 z-50"
    >
      <Spinner aria-hidden="true" className="size-6 text-primary" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
