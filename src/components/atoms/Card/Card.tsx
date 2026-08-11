import { cn } from "@/lib/utils";
import type { CardProps } from "./Card.types";

export function Card({ title, children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-sm",
        className,
      )}
    >
      <h3 className="mb-2 text-lg font-semibold text-zinc-100">{title}</h3>
      <div className="text-zinc-400">{children}</div>
    </div>
  );
}
