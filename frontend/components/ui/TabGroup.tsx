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
    <div className={cn("my-8 space-y-4", className)}>
      <div className="overflow-hidden rounded-[28px] border border-brand-deep/10 bg-[linear-gradient(145deg,#f4f7fb_0%,#eef3f9_100%)] shadow-[0_18px_40px_rgba(18,33,56,0.06)]">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Sections</span>
          <span className="text-caption text-text-muted">{active + 1} of {tabs.length}</span>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => setActive(index)}
              className={cn(
                "rounded-full px-4 py-2.5 text-caption font-semibold transition-all duration-200",
                index === active
                  ? "bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] text-white shadow-[0_16px_30px_rgba(36,54,115,0.18)]"
                  : "border border-white/80 bg-white/80 text-text-secondary hover:border-brand-action/20 hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="premium-panel rounded-[30px] px-6 py-6 md:px-8 md:py-8">
        <div className="mb-5 flex items-center justify-between rounded-[22px] border border-brand-action/10 bg-brand-action/[0.05] px-4 py-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Current section</p>
            <p className="mt-1 text-ui font-semibold text-brand-ink">{tabs[active]?.label}</p>
          </div>
        </div>

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