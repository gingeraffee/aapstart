import { cn } from "@/lib/utils";

type Variant = "tip" | "info" | "warning";

interface CalloutProps {
  variant?: Variant;
  children?: React.ReactNode;
  content?: string;
  className?: string;
}

const styles: Record<Variant, { label: string; shell: string; iconShell: string; iconColor: string }> = {
  tip: {
    label: "Coach note",
    shell: "border-[#b9d9f2] bg-[#f3faff]",
    iconShell: "bg-[#ddf0fe]",
    iconColor: "text-[#0f6da3]",
  },
  info: {
    label: "Worth noting",
    shell: "border-[#d7dff0] bg-[#f8f9fe]",
    iconShell: "bg-[#e9edfa]",
    iconColor: "text-[#37507b]",
  },
  warning: {
    label: "Heads up",
    shell: "border-[#efd7b4] bg-[#fff8eb]",
    iconShell: "bg-[#fbeecf]",
    iconColor: "text-[#9a661f]",
  },
};

function CalloutIcon({ variant }: { variant: Variant }) {
  if (variant === "warning") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 2.2 12 11H2L7 2.2z" />
        <path d="M7 5.1v3.2" />
        <path d="M7 10.2h.01" />
      </svg>
    );
  }

  if (variant === "info") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="7" cy="7" r="5" />
        <path d="M7 6.2v3" />
        <path d="M7 4.6h.01" />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 2.1v3.8" />
      <path d="M4.5 5.9A2.8 2.8 0 1 0 9.5 5.9" />
      <path d="M5.2 10.2h3.6" />
    </svg>
  );
}

export function Callout({ variant = "tip", children, content, className }: CalloutProps) {
  const style = styles[variant];

  return (
    <div className={cn("my-6 rounded-[13px] border p-4", style.shell, className)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]", style.iconShell, style.iconColor)} aria-hidden>
          <CalloutIcon variant={variant} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#5d7391]">{style.label}</p>
          <div className="prose-module text-[0.9rem]">{content ? <div dangerouslySetInnerHTML={{ __html: content }} /> : children}</div>
        </div>
      </div>
    </div>
  );
}

