"use client";

import { useState } from "react";
import { ChecklistItem } from "@/components/ui/ChecklistItem";
import type { ChecklistItem as ChecklistItemType } from "@/lib/types";

interface ChecklistBlockProps {
  items: ChecklistItemType[];
  onChange?: (checked: Record<string, boolean>) => void;
}

export function ChecklistBlock({ items, onChange }: ChecklistBlockProps) {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [item.label, item.checked]))
  );

  function toggle(label: string, value: boolean) {
    const next = { ...state, [label]: value };
    setState(next);
    onChange?.(next);
  }

  const allChecked = Object.values(state).every(Boolean);

  return (
    <div className="my-6 overflow-hidden rounded-[28px] border border-white/80 bg-white/[0.82] shadow-card backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Setup checklist</p>
          <p className="mt-1 text-ui text-text-secondary">Use this list to keep track of practical next steps.</p>
        </div>
        {allChecked && (
          <span className="rounded-full border border-success/15 bg-success-surface px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-success">
            All done
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        {items.map((item) => (
          <ChecklistItem
            key={item.label}
            label={item.label}
            checked={state[item.label] ?? false}
            onChange={(value) => toggle(item.label, value)}
          />
        ))}
      </div>
    </div>
  );
}