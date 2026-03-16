"use client";

import Link from "next/link";
import type { ModuleSummary, ProgressRecord } from "@/lib/types";

interface ModuleCardProps {
  module: ModuleSummary;
  progress?: ProgressRecord;
  index: number;
  featured?: boolean;
}

export function ModuleCard({ module, progress, index, featured = false }: ModuleCardProps) {
  const isComingSoon = module.status === "coming_soon";
  const isComplete = progress?.module_completed ?? false;
  const isInProgress = !isComplete && (progress?.visited || progress?.acknowledgements_completed || progress?.quiz_passed);

  const statusLabel = isComplete
    ? "Complete"
    : isInProgress
      ? "In progress"
      : isComingSoon
        ? "Coming soon"
        : "Ready";

  if (isComingSoon) {
    return (
      <div
        className="relative overflow-hidden rounded-[16px] p-6 opacity-75"
        style={{
          background: "#f8fafc",
          border: "1px dashed rgba(148,163,184,0.45)",
        }}
      >
        <p className="text-[0.7rem] font-semibold text-[#64748b]">{statusLabel}</p>
        <h3 className="mt-3 text-[1rem] font-semibold text-[#334155]">{module.title}</h3>
        <p className="mt-1.5 text-[0.84rem] leading-[1.58] text-[#64748b]">This section is not available yet.</p>
        <span className="pointer-events-none absolute bottom-3 right-5 text-[2.9rem] font-extrabold leading-none text-black/[0.06] select-none">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/modules/${module.slug}`}
      className="group relative block overflow-hidden rounded-[16px] p-6 transition-all duration-200 hover:-translate-y-px"
      style={{
        background: featured ? "#f3f9ff" : "#ffffff",
        border: featured ? "1px solid rgba(56,189,248,0.38)" : "1px solid rgba(214,222,235,0.95)",
        boxShadow: featured
          ? "0 12px 24px rgba(12,24,47,0.12)"
          : "0 8px 18px rgba(12,24,47,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[0.7rem] font-semibold"
          style={{
            color: isComplete ? "#15803d" : isInProgress ? "#0f6092" : "#64748b",
          }}
        >
          {statusLabel}
        </p>
        <p className="text-[0.72rem] font-medium text-[#64748b]">{Math.max(module.estimated_minutes, 1)} min</p>
      </div>

      <h3 className="mt-3 text-[1.04rem] font-semibold leading-tight tracking-[-0.01em] text-[#102343]">
        {module.title}
      </h3>

      <p className="mt-1.5 text-[0.86rem] leading-[1.6] line-clamp-3 text-[#516a88]">
        {module.description}
      </p>

      <div className="mt-4 text-[0.8rem] font-semibold text-[#0f6092] transition-all group-hover:underline">
        Open module -&gt;
      </div>

      <span className="pointer-events-none absolute bottom-3 right-4 text-[3rem] font-extrabold leading-none text-black/[0.05] select-none">
        {String(index + 1).padStart(2, "0")}
      </span>
    </Link>
  );
}
