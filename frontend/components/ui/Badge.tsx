import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "info" | "muted" | "coming-soon";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border border-brand-action/15 bg-brand-action/10 text-brand-action",
  success: "border border-success/15 bg-success-surface text-success",
  warning: "border border-warning/15 bg-warning-surface text-warning",
  info: "border border-brand-deep/12 bg-brand-deep/8 text-brand-deep",
  muted: "border border-border bg-surface-soft text-text-muted",
  "coming-soon": "border border-dashed border-border bg-surface-soft text-text-muted",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.15em]",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}