"use client";

import Link from "next/link";
import { cn, plural } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ModuleSummary, ProgressRecord } from "@/lib/types";

interface ModuleCardProps {
  module: ModuleSummary;
  progress?: ProgressRecord;
  index: number;
}

export function ModuleCard({ module, progress, index }: ModuleCardProps) {
  const isComingSoon = module.status === "coming_soon";
  const isComplete = progress?.module_completed ?? false;
  const isInProgress = !isComplete && (progress?.visited || progress?.acknowledgements_completed || progress?.quiz_passed);

  if (isComingSoon) {
    return (
      <Card className="border-dashed border-border/90 bg-white/[0.62] opacity-75" padding="md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <IndexBadge index={index} status="coming-soon" />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="coming-soon">Coming soon</Badge>
              <span className="text-caption text-text-muted">Future module</span>
            </div>
            <h3 className="text-h3 text-text-secondary">{module.title}</h3>
            <p className="text-ui text-text-muted">This section is intentionally hidden until it is ready.</p>
          </div>
        </div>
      </Card>
    );
  }

  const status = isComplete
    ? { title: "Completed", body: "Review any time", tone: "text-success" }
    : isInProgress
      ? { title: "In progress", body: "Resume where you left off", tone: "text-brand-action" }
      : { title: "Ready to start", body: "Open module", tone: "text-brand-deep" };

  return (
    <Link href={`/modules/${module.slug}`} className="block">
      <Card hover padding="md" className={cn(isComplete && "border-success/20 bg-success-surface/[0.65]") }>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-5">
            <IndexBadge index={index} status={isComplete ? "complete" : isInProgress ? "in-progress" : "default"} />

            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted">Module {String(index + 1).padStart(2, "0")}</Badge>
                <Badge variant="info">~{module.estimated_minutes} {plural(module.estimated_minutes, "min", "mins")}</Badge>
                {module.requires_acknowledgement && <Badge variant="muted">Acknowledgement</Badge>}
                {module.requires_quiz && <Badge variant="muted">Quiz</Badge>}
              </div>

              <div>
                <h3 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-text-primary group-hover:text-brand-ink">{module.title}</h3>
                <p className="mt-2 max-w-3xl text-ui text-text-secondary">{module.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 xl:min-w-[15rem] xl:flex-col xl:items-end xl:text-right">
            <div>
              <p className={cn("text-ui font-semibold", status.tone)}>{status.title}</p>
              <p className="text-caption text-text-muted">{status.body}</p>
            </div>
            <span className="inline-flex items-center gap-2 text-ui font-semibold text-brand-action">
              {isComplete ? "Review module" : isInProgress ? "Resume module" : "Start module"}
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function IndexBadge({ index, status }: { index: number; status: "default" | "in-progress" | "complete" | "coming-soon" }) {
  const classes = {
    default: "border-border bg-white text-text-muted",
    "in-progress": "border-brand-action/20 bg-brand-action/[0.08] text-brand-action",
    complete: "border-success/20 bg-success text-white",
    "coming-soon": "border-border bg-surface-soft text-text-muted",
  } as const;

  return (
    <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border text-sm font-bold shadow-sm", classes[status])}>
      {String(index + 1).padStart(2, "0")}
    </div>
  );
}