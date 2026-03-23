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
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div
      className="overflow-hidden rounded-[16px]"
      style={{
        border: allDone
          ? "1px solid rgba(34,197,94,0.35)"
          : "1px solid var(--module-panel-border)",
        background: allDone ? "rgba(34,197,94,0.04)" : "var(--login-input-bg)",
        transition: "border-color 0.3s, background 0.3s",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: allDone
            ? "1px solid rgba(34,197,94,0.18)"
            : "1px solid var(--module-panel-border)",
          background: allDone
            ? "rgba(34,197,94,0.08)"
            : "var(--module-time-bg)",
        }}
      >
        <span
          className="text-[0.7rem] font-semibold uppercase tracking-[0.13em]"
          style={{ color: allDone ? "#16a34a" : "#0e76bd" }}
        >
          Action list
        </span>
        <span
          className="text-[0.72rem] font-medium tabular-nums"
          style={{ color: allDone ? "#16a34a" : "#0e76bd" }}
        >
          {doneCount} of {total}
          {allDone && " complete"}
        </span>
      </div>

      <div className="px-5 pb-3">
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--welcome-progress-track)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(pct, 6)}%`,
              background: "linear-gradient(90deg,#22d3ee_0%,#0ea5d9_55%,#df0030_100%)",
              opacity: pct === 0 ? 0.35 : 1,
            }}
          />
        </div>
      </div>

      <div className="divide-y pb-3" style={{ borderColor: "rgba(14,118,189,0.08)" }}>
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
