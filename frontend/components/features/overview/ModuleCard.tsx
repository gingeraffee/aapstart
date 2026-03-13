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
      <div className="relative overflow-hidden rounded-bento border border-dashed border-border p-6 opacity-60">
        <Badge variant="locked">Coming Soon</Badge>
        <h3 className="mt-3 text-[0.9rem] font-bold text-text-secondary">{module.title}</h3>
        <p className="mt-1 text-[0.76rem] text-text-muted">This section is not ready yet.</p>
        <span className="pointer-events-none absolute bottom-2 right-4 text-[3rem] font-extrabold leading-none text-black/[0.04]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/modules/${module.slug}`}
      className={cn(
        "group relative block overflow-hidden rounded-bento border p-6 transition-all duration-200",
        "hover:border-brand-action hover:-translate-y-0.5 hover:shadow-card",
        featured
          ? "bg-brand-ink text-white border-brand-ink col-span-2"
          : "bg-surface border-border"
      )}
    >
      <Badge variant={featured ? "active" : statusBadge.variant} className={featured ? "bg-white/10 text-white border-0" : ""}>
        {statusBadge.label}
      </Badge>

      <h3 className={cn(
        "mt-3 text-[0.9rem] font-bold",
        featured ? "text-white" : "text-text-primary"
      )}>
        {module.title}
      </h3>

      <p className={cn(
        "mt-1 text-[0.76rem] line-clamp-2",
        featured ? "text-white/60" : "text-text-muted"
      )}>
        {module.description}
      </p>

      {/* Large faded number */}
      <span className={cn(
        "pointer-events-none absolute bottom-2 right-4 text-[3rem] font-extrabold leading-none",
        featured ? "text-white/[0.06]" : "text-black/[0.04]"
      )}>
        {String(index + 1).padStart(2, "0")}
      </span>
    </Link>
  );
}
