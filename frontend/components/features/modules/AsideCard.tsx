"use client";

import { Lock } from "lucide-react";

interface AsideCardProps {
  content: string;
  header?: string;
}

export function AsideCard({ content, header }: AsideCardProps) {
  return (
    <div
      className="mb-4 ml-5 w-[220px] shrink-0 rounded-[12px] border-2 border-[#22d3ee] bg-white p-4 shadow-[0_4px_14px_rgba(12,24,47,0.08)]"
      style={{ float: "right", shapeMargin: "12px" }}
    >
      <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-[8px] bg-[rgba(34,211,238,0.1)]">
        <Lock size={14} className="text-[#0a1628]" />
      </div>
      {header && (
        <p className="mb-1.5 text-[0.78rem] font-bold leading-tight text-[#0a1628]">{header}</p>
      )}
      <div
        className="text-[0.74rem] leading-[1.55] text-[#0a1628]"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
