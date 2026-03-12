import { cn } from "@/lib/utils";

type Variant = "tip" | "info" | "warning";

interface CalloutProps {
  variant?: Variant;
  children?: React.ReactNode;
  content?: string;
  className?: string;
}

const styles: Record<Variant, { label: string; shell: string; dot: string }> = {
  tip: {
    label: "Helpful context",
    shell: "border-brand-action/16 bg-info-surface/85",
    dot: "bg-brand-action",
  },
  info: {
    label: "Worth noting",
    shell: "border-brand-deep/16 bg-brand-deep/[0.05]",
    dot: "bg-brand-deep",
  },
  warning: {
    label: "Important",
    shell: "border-warning/18 bg-warning-surface/90",
    dot: "bg-warning",
  },
};

export function Callout({ variant = "tip", children, content, className }: CalloutProps) {
  const style = styles[variant];

  return (
    <div className={cn("my-6 flex gap-4 rounded-[24px] border p-5 shadow-sm", style.shell, className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/75 shadow-sm">
        <span className={cn("h-3 w-3 rounded-full", style.dot)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-text-muted">{style.label}</p>
        <div className="prose-module text-sm">
          {content ? <div dangerouslySetInnerHTML={{ __html: content }} /> : children}
        </div>
      </div>
    </div>
  );
}