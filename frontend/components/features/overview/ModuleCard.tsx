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
          background: "var(--card-coming-soon-bg)",
          border: "1px dashed var(--card-coming-soon-border)",
        }}
      >
        <p className="text-[0.7rem] font-semibold" style={{ color: "var(--card-coming-soon-desc)" }}>{statusLabel}</p>
        <h3 className="mt-3 text-[1rem] font-semibold" style={{ color: "var(--card-coming-soon-title)" }}>{module.title}</h3>
        <p className="mt-1.5 text-[0.84rem] leading-[1.58]" style={{ color: "var(--card-coming-soon-desc)" }}>This section is not available yet.</p>
        <span className="pointer-events-none absolute bottom-3 right-5 text-[2.9rem] font-extrabold leading-none select-none" style={{ color: "var(--card-number-color)" }}>
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
        background: featured ? "var(--card-bg-alt)" : "var(--card-bg)",
        border: featured ? "1px solid var(--card-border-featured)" : "1px solid var(--card-border)",
        boxShadow: featured ? "var(--card-shadow-featured)" : "var(--card-shadow)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[0.7rem] font-semibold"
          style={{
            color: isComplete ? "var(--status-complete)" : isInProgress ? "var(--status-progress)" : "var(--status-ready)",
          }}
        >
          {statusLabel}
        </p>
        <p className="text-[0.72rem] font-medium" style={{ color: "var(--status-ready)" }}>{Math.max(module.estimated_minutes, 1)} min</p>
      </div>

      <h3 className="mt-3 text-[1.04rem] font-semibold leading-tight tracking-[-0.01em]" style={{ color: "var(--card-title)" }}>
        {module.title}
      </h3>

      <p className="mt-1.5 text-[0.86rem] leading-[1.6] line-clamp-3" style={{ color: "var(--card-desc)" }}>
        {module.card_description || module.description}
      </p>

      <div className="mt-4 text-[0.8rem] font-semibold transition-all group-hover:underline" style={{ color: "var(--card-link)" }}>
        Open module -&gt;
      </div>

      <span className="pointer-events-none absolute bottom-3 right-4 text-[3rem] font-extrabold leading-none select-none" style={{ color: "var(--card-number-color)" }}>
        {String(index + 1).padStart(2, "0")}
      </span>
    </Link>
  );
}
