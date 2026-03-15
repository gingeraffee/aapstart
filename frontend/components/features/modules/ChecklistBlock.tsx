"use client";

import { useState } from "react";
import { ChecklistItem } from "@/components/ui/ChecklistItem";
import type { ChecklistBlockItem } from "@/lib/types";

interface ChecklistBlockProps {
  items: ChecklistBlockItem[];
}

export function ChecklistBlock({ items }: ChecklistBlockProps) {
  const [checked, setChecked] = useState<boolean[]>(() => items.map((i) => i.checked));

  const toggle = (index: number, val: boolean) =>
    setChecked((prev) => prev.map((v, j) => (j === index ? val : v)));

  const doneCount = checked.filter(Boolean).length;
  const total = items.length;
  const allDone = doneCount === total;

  return (
    <div
      className="overflow-hidden rounded-[16px]"
      style={{
        border: allDone
          ? "1.5px solid rgba(34,197,94,0.35)"
          : "1.5px solid rgba(14,118,189,0.18)",
        background: allDone ? "rgba(34,197,94,0.04)" : "rgba(14,118,189,0.03)",
        transition: "border-color 0.3s, background 0.3s",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: allDone
            ? "1px solid rgba(34,197,94,0.18)"
            : "1px solid rgba(14,118,189,0.12)",
          background: allDone
            ? "rgba(34,197,94,0.07)"
            : "rgba(14,118,189,0.05)",
        }}
      >
        <span
          className="text-[0.7rem] font-bold uppercase tracking-[0.18em]"
          style={{ color: allDone ? "#16a34a" : "#0e76bd" }}
        >
          Setup Checklist
        </span>
        <span
          className="text-[0.72rem] font-semibold tabular-nums"
          style={{ color: allDone ? "#16a34a" : "#0e76bd" }}
        >
          {doneCount}/{total}
          {allDone && " ✓ All done"}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y" style={{ borderColor: "rgba(14,118,189,0.08)" }}>
        {items.map((item, i) => (
          <div key={i} className="px-2">
            <ChecklistItem
              label={item.label}
              checked={checked[i]}
              onChange={(val) => toggle(i, val)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
