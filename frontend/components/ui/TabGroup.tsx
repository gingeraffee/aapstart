"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  label: string;
  content: string;
}

interface TabGroupProps {
  tabs: Tab[];
  className?: string;
}

export function TabGroup({ tabs, className }: TabGroupProps) {
  const [active, setActive] = useState(0);

  if (!tabs || tabs.length === 0) return null;

  return (
    <div className={cn("my-8 space-y-6", className)}>
      {/* Segmented control */}
      <div
        className="inline-flex rounded-[11px] p-[3px]"
        style={{ background: "linear-gradient(180deg, #e5edf8 0%, #dde7f6 100%)", border: "1px solid #d0dbec" }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActive(index)}
            className={cn(
              "rounded-[8px] px-5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
              index === active
                ? "bg-white text-text-primary shadow-[0_4px_10px_rgba(8,17,36,0.12)]"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div
        className="rounded-bento border border-border bg-surface p-6 shadow-card md:p-8"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,251,255,0.94) 100%)" }}
      >
        {tabs.map((tab, index) => (
          <div
            key={tab.label}
            className={cn("prose-module", index === active ? "block animate-fade-in" : "hidden")}
            dangerouslySetInnerHTML={{ __html: tab.content }}
          />
        ))}
      </div>
    </div>
  );
}
