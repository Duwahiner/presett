export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-5 sm:p-7">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          <div className="h-7 w-56 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 rounded-lg bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-8 w-14 rounded bg-muted animate-pulse" />
              </div>
              <div className="size-10 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </section>

      {/* Bottom grid skeleton */}
      <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Agent tiles skeleton */}
        <section className="flex flex-col xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-xl bg-muted animate-pulse" />
                  <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions skeleton */}
        <section className="flex flex-col">
          <div className="mb-3 h-4 w-36 rounded bg-muted animate-pulse" />
          <div className="flex flex-1 flex-col gap-2.5 rounded-xl border bg-card p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl p-2.5"
              >
                <div className="size-9 shrink-0 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-44 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
            <div className="mt-auto rounded-xl bg-accent p-4 space-y-2">
              <div className="h-4 w-32 rounded bg-accent-foreground/20 animate-pulse" />
              <div className="h-3 w-48 rounded bg-accent-foreground/20 animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
