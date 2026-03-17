import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const shadcnBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sh-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-sh-primary text-sh-primary-foreground hover:bg-sh-primary/80",
        secondary: "border-transparent bg-sh-secondary text-sh-secondary-foreground hover:bg-sh-secondary/80",
        destructive: "border-transparent bg-sh-destructive text-sh-destructive-foreground hover:bg-sh-destructive/80",
        outline: "text-sh-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ShadcnBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof shadcnBadgeVariants> {}

function ShadcnBadge({ className, variant, ...props }: ShadcnBadgeProps) {
  return (
    <div className={cn(shadcnBadgeVariants({ variant }), className)} {...props} />
  );
}

export { ShadcnBadge, shadcnBadgeVariants };
