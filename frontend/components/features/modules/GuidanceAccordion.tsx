"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ContentBlock } from "./ContentBlock";
import type { ContentBlock as ContentBlockType } from "@/lib/types";

interface AccordionGroup {
  title: string;
  blocks: ContentBlockType[];
}

/** Groups blocks into accordion sections: each subheading starts a new group. */
function groupBySubheading(blocks: ContentBlockType[]): { preamble: ContentBlockType[]; groups: AccordionGroup[] } {
  const preamble: ContentBlockType[] = [];
  const groups: AccordionGroup[] = [];
  let current: AccordionGroup | null = null;

  for (const block of blocks) {
    if (block.type === "subheading") {
      if (current) groups.push(current);
      current = { title: block.content ?? "", blocks: [] };
    } else if (current) {
      current.blocks.push(block);
    } else {
      preamble.push(block);
    }
  }
  if (current) groups.push(current);

  return { preamble, groups };
}

interface GuidanceAccordionProps {
  blocks: ContentBlockType[];
  sectionId: string;
  variant?: "training" | "resource";
}

export function GuidanceAccordion({ blocks, sectionId, variant = "resource" }: GuidanceAccordionProps) {
  const { preamble, groups } = groupBySubheading(blocks);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-0">
      {/* Preamble blocks (text before any subheading) */}
      {preamble.map((block, i) => (
        <div key={`${sectionId}-pre-${i}`} className="animate-fade-up">
          <ContentBlock block={block} emphasizeLead={block.type === "text" && i === 0} variant={variant} />
        </div>
      ))}

      {/* Accordion groups */}
      <div className="mt-4 space-y-2">
        {groups.map((group, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={`${sectionId}-acc-${i}`}
              className="overflow-hidden rounded-xl border transition-colors duration-200"
              style={{
                borderColor: isOpen ? "rgba(15,127,179,0.3)" : "rgba(27,44,86,0.12)",
                background: isOpen ? "rgba(15,127,179,0.03)" : "transparent",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-[rgba(15,127,179,0.04)]"
              >
                {/* Chevron */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "shrink-0 transition-transform duration-200",
                    isOpen ? "rotate-90" : "rotate-0"
                  )}
                  style={{ color: isOpen ? "#0f7fb3" : "#607896" }}
                >
                  <path d="M6 3l5 5-5 5" />
                </svg>
                <h3
                  className="text-[0.98rem] font-bold tracking-[-0.01em]"
                  style={{ color: isOpen ? "#0f7fb3" : "var(--heading-color, #112744)" }}
                >
                  {group.title}
                </h3>
              </button>

              {/* Collapsible content */}
              {isOpen && (
                <div className="px-5 pb-5 pt-1" style={{ paddingLeft: "2.75rem" }}>
                  <div className="space-y-4">
                    {group.blocks.map((block, bi) => (
                      <div key={`${sectionId}-acc-${i}-${bi}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(bi, 6) * 30}ms` }}>
                        <ContentBlock block={block} emphasizeLead={false} variant={variant} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
