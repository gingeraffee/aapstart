import { cn } from "@/lib/utils";

interface ChecklistItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function ChecklistItem({ label, checked, onChange, className }: ChecklistItemProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[10px] border p-4 transition-all duration-200",
        checked
          ? "border-[#9ed9c5] bg-[#f2fbf6] dark:border-emerald-800 dark:bg-emerald-900/20"
          : "border-[#d6deeb] hover:border-[#b9cce5] dark:border-[rgba(30,58,95,0.5)] dark:hover:border-[rgba(56,189,248,0.25)]",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 transition-all",
          checked
            ? "border-[#36a582] bg-[#2f8768] text-white"
            : "border-border bg-white dark:border-[rgba(30,58,95,0.6)] dark:bg-[rgba(15,25,42,0.5)]"
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[0.88rem] leading-[1.5]" style={{ color: checked ? "var(--heading-color)" : "var(--module-body)" }}>
        {label}
      </span>
    </label>
  );
}
