import { Skeleton } from "@/components/ui/skeleton";

type PageSkeletonVariant = "models" | "profiles" | "backups" | "usageStats" | "diagnostics";

function Block({ className = "" }: { className?: string }) {
  return <Skeleton className={className} />;
}

export function PageSkeleton({ variant, label }: { variant: PageSkeletonVariant; label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="space-y-4">
      {variant === "models" && <>
        <Block className="h-16" />
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((item) => <Block key={item} className="h-20" />)}</div>
        <Block className="h-12 w-56" />
      </>}
      {variant === "profiles" && <>
        <Block className="h-14" />
        <div className="space-y-3">{[1, 2, 3, 4].map((item) => <Block key={item} className="h-20" />)}</div>
      </>}
      {variant === "backups" && <>
        <Block className="h-40" />
        <div className="space-y-3">{[1, 2, 3].map((item) => <Block key={item} className="h-28" />)}</div>
      </>}
      {variant === "usageStats" && <>
        <Block className="h-16" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <Block key={item} className="h-20" />)}</div>
        <div className="space-y-4">{[1, 2, 3].map((item) => <Block key={item} className="h-24" />)}</div>
      </>}
      {variant === "diagnostics" && <>
        <Block className="h-32" />
        <div className="grid gap-4 lg:grid-cols-3">{[1, 2, 3].map((item) => <Block key={item} className="h-28" />)}</div>
        <Block className="h-56" />
      </>}
      <span className="sr-only">{label}</span>
    </div>
  );
}
