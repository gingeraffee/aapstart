import { cn } from "@/lib/utils";

type Variant = "tip" | "info" | "warning";

interface CalloutProps {
  variant?: Variant;
  children?: React.ReactNode;
  content?: string;
  className?: string;
  /** Override the default label (e.g. "Manager note" instead of "Coach note") */
  label?: string;
}

const styles: Record<Variant, { label: string; shell: string; iconShell: string; iconColor: string }> = {
  tip: {
    label: "Coach note",
    shell: "border-[#b9d9f2] bg-[#f3faff] dark:border-[rgba(56,189,248,0.25)] dark:bg-[rgba(56,189,248,0.06)]",
    iconShell: "bg-[#ddf0fe] dark:bg-[rgba(56,189,248,0.12)]",
    iconColor: "text-[#0f6da3] dark:text-[#38bdf8]",
  },
  info: {
    label: "Worth noting",
    shell: "border-[#d7dff0] bg-[#f8f9fe] dark:border-[rgba(30,58,95,0.5)] dark:bg-[rgba(30,58,95,0.2)]",
    iconShell: "bg-[#e9edfa] dark:bg-[rgba(30,58,95,0.3)]",
    iconColor: "text-[#37507b] dark:text-[#94b4d4]",
  },
  warning: {
    label: "Heads up",
    shell: "border-[#efd7b4] bg-[#fff8eb] dark:border-[rgba(234,179,8,0.25)] dark:bg-[rgba(234,179,8,0.06)]",
    iconShell: "bg-[#fbeecf] dark:bg-[rgba(234,179,8,0.12)]",
    iconColor: "text-[#9a661f] dark:text-[#eab308]",
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

export function Callout({ variant = "tip", children, content, className, label }: CalloutProps) {
  const style = styles[variant] ?? styles.tip;

  return (
    <div className={cn("my-3 rounded-[11px] border px-3 pt-2.5 pb-1.5", style.shell, className)}>
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px]", style.iconShell, style.iconColor)} aria-hidden>
          <CalloutIcon variant={variant} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>{label ?? style.label}</p>
          <div className="prose-module text-[0.9rem]">{content ? <div dangerouslySetInnerHTML={{ __html: content }} /> : children}</div>
        </div>
      </div>
    </div>
  );
}
