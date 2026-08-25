import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center border px-3 font-mono text-[11px] font-bold leading-4 uppercase w-fit whitespace-nowrap shrink-0 h-7 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25",
        secondary:
          "border-accent/50 bg-accent/15 text-accent-foreground hover:bg-accent/25",
        destructive:
          "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
