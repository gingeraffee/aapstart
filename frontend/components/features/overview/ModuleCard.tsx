"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
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

  const statusBadge = isComplete
    ? { label: "Done", variant: "done" as const }
    : isInProgress
      ? { label: "In Progress", variant: "active" as const }
      : isComingSoon
        ? { label: "Coming Soon", variant: "locked" as const }
        : { label: "Ready", variant: "locked" as const };

  if (isComingSoon) {
    return (
      <div
        className="relative overflow-hidden rounded-[20px] p-6 opacity-40"
        style={{
          backgroundColor: "#F7F3F2",
          border: "1px dashed #C8BFB9",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        <Badge variant="locked">Coming Soon</Badge>
        <h3 className="mt-4 text-[1rem] font-bold text-text-secondary">{module.title}</h3>
        <p className="mt-1.5 text-[0.82rem] leading-[1.5] text-text-muted">This section is not ready yet.</p>
        <span className="pointer-events-none absolute bottom-3 right-5 text-[3.5rem] font-extrabold leading-none text-black/[0.05] select-none">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    );
  }

  if (featured) {
    return (
      <Link
        href={`/modules/${module.slug}`}
        className="group relative block overflow-hidden rounded-[20px] transition-all duration-200 hover:-translate-y-0.5"
        style={{
          backgroundColor: "#FAFAF8",
          boxShadow: "0 8px 36px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[20px] bg-gradient-to-b from-brand-action to-brand-sky" />

        <div className="relative z-[1] p-7 pl-8">
          <Badge variant="active">
            {statusBadge.label}
          </Badge>

          <h3 className="mt-4 text-[1.25rem] font-extrabold leading-tight tracking-[-0.02em] text-text-primary">
            {module.title}
          </h3>
          <p className="mt-2 text-[0.88rem] leading-[1.6] text-text-secondary line-clamp-2">
            {module.description}
          </p>

          <div className="mt-6 flex items-center gap-2 text-[0.82rem] font-semibold text-brand-action group-hover:gap-3 transition-all">
            Start module
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h12M12 5l5 5-5 5" />
            </svg>
          </div>
        </div>

        <span className="pointer-events-none absolute bottom-4 right-5 text-[4.5rem] font-extrabold leading-none text-black/[0.04] select-none">
          {String(index + 1).padStart(2, "0")}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/modules/${module.slug}`}
      className="group relative block overflow-hidden rounded-[20px] p-6 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: "#FAFAF8",
        boxShadow: "0 4px 24px rgba(0,0,0,0.32), 0 1px 4px rgba(0,0,0,0.12)",
      }}
    >
      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>

      <h3 className="mt-4 text-[1rem] font-bold leading-tight tracking-[-0.01em] text-text-primary">
        {module.title}
      </h3>

      <p className="mt-1.5 text-[0.82rem] leading-[1.55] line-clamp-2 text-text-muted">
        {module.description}
      </p>

      <span className="pointer-events-none absolute bottom-3 right-4 text-[3.5rem] font-extrabold leading-none text-black/[0.04] select-none">
        {String(index + 1).padStart(2, "0")}
      </span>
    </Link>
  );
}
