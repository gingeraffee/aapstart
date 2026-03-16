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
        checked ? "border-[#9ed9c5] bg-[#f2fbf6]" : "border-[#d6deeb] hover:border-[#b9cce5] hover:bg-bg-light",
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
            : "border-border bg-white"
        )}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={cn(
        "text-[0.88rem] leading-[1.5]",
        checked ? "text-text-primary" : "text-text-secondary"
      )}>
        {label}
      </span>
    </label>
  );
}
