import { cn } from "@/lib/utils";

type Variant = "tip" | "info" | "warning";

interface CalloutProps {
  variant?: Variant;
  children?: React.ReactNode;
  content?: string;
  className?: string;
}

const styles: Record<Variant, { label: string; shell: string; icon: string }> = {
  tip: {
    label: "Coach Tip",
    shell: "border-brand-action/15 bg-brand-action/[0.04]",
    icon: "text-brand-action",
  },
  info: {
    label: "Worth noting",
    shell: "border-accent/15 bg-accent-soft",
    icon: "text-accent",
  },
  warning: {
    label: "Important",
    shell: "border-warning/18 bg-warning-surface",
    icon: "text-warning",
  },
};

export function Callout({ variant = "tip", children, content, className }: CalloutProps) {
  const style = styles[variant];

  return (
    <div className={cn("my-6 flex items-start gap-3 rounded-[12px] border p-4", style.shell, className)}>
      <span className={cn("mt-0.5 text-lg", style.icon)} aria-hidden>
        {variant === "tip" ? "💡" : variant === "warning" ? "⚠️" : "ℹ️"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-text-muted">{style.label}</p>
        <div className="prose-module text-sm">
          {content ? <div dangerouslySetInnerHTML={{ __html: content }} /> : children}
        </div>
      </div>
    </div>
  );
}
