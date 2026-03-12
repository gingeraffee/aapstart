"use client";

import { cn } from "@/lib/utils";

interface ChecklistItemProps {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  readonly?: boolean;
  className?: string;
}

export function ChecklistItem({
  label,
  checked,
  onChange,
  readonly = false,
  className,
}: ChecklistItemProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-4 rounded-[22px] border border-transparent px-4 py-4 transition-all duration-200",
        !readonly && "cursor-pointer hover:border-border hover:bg-slate-950/[0.02]",
        className
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={readonly}
          className="sr-only"
        />
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-xl border transition-all duration-200",
            checked
              ? "border-brand-action bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] text-white shadow-[0_12px_22px_rgba(36,54,115,0.18)]"
              : "border-border bg-white text-transparent"
          )}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 10" fill="none" aria-hidden>
            <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <span className={cn("text-ui leading-7", checked ? "text-text-primary" : "text-text-secondary")}>{label}</span>
    </label>
  );
}