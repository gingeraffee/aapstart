import * as React from "react";
import { cn } from "@/lib/utils";

interface ShadcnProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

const ShadcnProgress = React.forwardRef<HTMLDivElement, ShadcnProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
    const pct = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-sh-secondary",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 bg-sh-primary transition-all",
            indicatorClassName
          )}
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </div>
    );
  }
);
ShadcnProgress.displayName = "ShadcnProgress";

export { ShadcnProgress };
