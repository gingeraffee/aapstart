import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const shadcnButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sh-md text-sm font-medium ring-offset-sh-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sh-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-sh-primary text-sh-primary-foreground hover:bg-sh-primary/90",
        destructive: "bg-sh-destructive text-sh-destructive-foreground hover:bg-sh-destructive/90",
        outline: "border border-sh-border bg-sh-background hover:bg-sh-accent hover:text-sh-accent-foreground",
        secondary: "bg-sh-secondary text-sh-secondary-foreground hover:bg-sh-secondary/80",
        ghost: "hover:bg-sh-accent hover:text-sh-accent-foreground",
        link: "text-sh-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-sh-md px-3",
        lg: "h-11 rounded-sh-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ShadcnButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof shadcnButtonVariants> {
  asChild?: boolean;
}

const ShadcnButton = React.forwardRef<HTMLButtonElement, ShadcnButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(shadcnButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
ShadcnButton.displayName = "ShadcnButton";

export { ShadcnButton, shadcnButtonVariants };
