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
      <div className="inline-flex rounded-[10px] bg-gray-100 p-[3px]">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActive(index)}
            className={cn(
              "rounded-[8px] px-5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
              index === active
                ? "bg-white text-text-primary shadow-tab"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className="rounded-bento border border-border bg-surface p-6 md:p-8">
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
