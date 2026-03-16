"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn, plural } from "@/lib/utils";

export type ModuleStepKey = "read" | "confirm" | "quiz" | "complete";
type ModuleStepState = "complete" | "current" | "upcoming";

interface ModuleStep {
  key: ModuleStepKey;
  label: string;
  state: ModuleStepState;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ModuleShellProps {
  breadcrumbs: BreadcrumbItem[];
  moduleOrder: number;
  stageLabel: string;
  headline: string;
  description: string;
  contextNote?: string;
  estimatedMinutes?: number;
  steps: ModuleStep[];
  children: React.ReactNode;
  rail?: React.ReactNode;
  footer?: React.ReactNode;
}

interface ModulePanelProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  noPadding?: boolean;
}

interface ModuleFooterProps {
  backHref: string;
  backLabel: string;
  ctaLabel: string;
  onCtaClick?: () => void;
  ctaHref?: string;
  disabled?: boolean;
  helperText?: string;
}

const STEP_LABELS: Record<ModuleStepKey, string> = {
  read: "Read",
  confirm: "Confirm",
  quiz: "Quiz",
  complete: "Complete",
};

export function buildModuleSteps({
  requiresAcknowledgement,
  requiresQuiz,
  current,
  includeComplete = false,
}: {
  requiresAcknowledgement: boolean;
  requiresQuiz: boolean;
  current: ModuleStepKey;
  includeComplete?: boolean;
}): ModuleStep[] {
  const keys: ModuleStepKey[] = ["read"];
  if (requiresAcknowledgement) keys.push("confirm");
  if (requiresQuiz) keys.push("quiz");
  if (includeComplete) keys.push("complete");

  const currentIndex = Math.max(keys.indexOf(current), 0);

  return keys.map((key, index) => ({
    key,
    label: STEP_LABELS[key],
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));
}

function StepPill({ step, index }: { step: ModuleStep; index: number }) {
  const styles =
    step.state === "current"
      ? {
          shell: "text-[#0f5e92]",
          dot: "border-[#7fc3ec] bg-[#ebf7ff] text-[#0f6da3]",
          label: String(index + 1),
        }
      : step.state === "complete"
        ? {
            shell: "text-emerald-700",
            dot: "border-emerald-300 bg-emerald-50 text-emerald-700",
            label: "✓",
          }
        : {
            shell: "text-[#64748b]",
            dot: "border-[#d1dfef] bg-[#f2f7fd] text-[#64748b]",
            label: String(index + 1),
          };

  return (
    <div className={cn("inline-flex items-center gap-2 text-[0.71rem] font-semibold transition-colors duration-200", styles.shell)}>
      <span className={cn("flex h-[18px] min-w-[18px] items-center justify-center rounded-full border text-[0.54rem] font-bold uppercase tracking-[0.03em]", styles.dot)}>
        {styles.label}
      </span>
      {step.label}
    </div>
  );
}

export function ModulePanel({ children, className, id, noPadding = false }: ModulePanelProps) {
  return (
    <section
      id={id}
      className={cn(
        "overflow-hidden rounded-[16px] border border-[#cfdbea] bg-white shadow-[0_12px_22px_rgba(12,24,47,0.1)] transition-shadow duration-200 hover:shadow-[0_15px_26px_rgba(12,24,47,0.12)]",
        !noPadding && "px-7 py-7 md:px-8",
        className
      )}
    >
      {children}
    </section>
  );
}

export function ModuleFooter({
  backHref,
  backLabel,
  ctaLabel,
  onCtaClick,
  ctaHref,
  disabled,
  helperText,
}: ModuleFooterProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#cfdbea] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4 shadow-[0_10px_18px_rgba(12,24,47,0.08)] sm:flex-row sm:items-center sm:justify-between">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-text-muted transition-colors hover:text-text-primary">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2L4 7l5 5" />
        </svg>
        {backLabel}
      </Link>
      <div className="flex flex-col items-end gap-1.5">
        {ctaHref ? (
          <Link
            href={ctaHref}
            className={cn(
              "inline-flex h-[2.8rem] items-center rounded-button border border-[#6eaeea] px-6 text-[0.88rem] font-bold text-white shadow-[0_8px_16px_rgba(15,127,179,0.2)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_20px_rgba(15,127,179,0.24)]",
              "bg-[linear-gradient(135deg,#184371_0%,#13629a_100%)]"
            )}
          >
            {ctaLabel}
          </Link>
        ) : (
          <Button onClick={onCtaClick} disabled={disabled} className="h-[2.8rem] px-6 text-[0.88rem]">
            {ctaLabel}
          </Button>
        )}
        {helperText ? <p className="text-[0.73rem] text-text-muted">{helperText}</p> : null}
      </div>
    </div>
  );
}

export function ModuleShell({
  breadcrumbs,
  moduleOrder,
  stageLabel,
  headline,
  description,
  contextNote,
  estimatedMinutes,
  steps,
  children,
  rail,
  footer,
}: ModuleShellProps) {
  return (
    <div className="w-full px-6 py-7 lg:px-8 lg:py-9">
      <div className="mx-auto w-full max-w-[1160px]">
        <div className="flex items-start gap-7">
          <div className="min-w-0 flex-1 space-y-6 animate-fade-up">
            <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-text-muted">
              {breadcrumbs.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {item.href ? (
                    <Link href={item.href} className="transition-colors hover:text-text-primary">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-text-primary">{item.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                </div>
              ))}
            </div>

            <section className="relative overflow-hidden rounded-[20px] border border-[#bfd4eb] bg-[linear-gradient(170deg,#ffffff_0%,#f7fbff_100%)] shadow-[0_16px_28px_rgba(12,24,47,0.12)]">
              <div className="h-1 w-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_52%,#df0030_100%)]" />
              <div className="px-7 pb-7 pt-6">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-brand-action">
                  Module {String(moduleOrder).padStart(2, "0")} - {stageLabel}
                </p>
                <h1 className="mt-2 text-[clamp(1.52rem,2.5vw,2.02rem)] font-extrabold leading-[1.14] tracking-[-0.028em] text-[#0d1f3a]">
                  {headline}
                </h1>
                <p className="mt-2.5 max-w-[700px] text-[0.94rem] leading-[1.72] text-[#334f72]">{description}</p>
                {contextNote ? (
                  <p className="mt-2 text-[0.8rem] font-medium text-[#4f6787]">
                    Context: {contextNote}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {typeof estimatedMinutes === "number" ? (
                    <span className="inline-flex items-center gap-1.5 text-[0.77rem] font-medium text-[#5d7391]">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <circle cx="6" cy="6" r="4.5" />
                        <path d="M6 3.5v2.5l1.5 1" />
                      </svg>
                      ~{estimatedMinutes} {plural(estimatedMinutes, "min", "mins")}
                    </span>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {steps.map((step, index) => (
                      <div key={step.key} className="flex items-center gap-2">
                        <StepPill step={step} index={index} />
                        {index < steps.length - 1 ? <span className="h-px w-3 rounded-full bg-[#b9cee6]" /> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {children}
            {footer}
          </div>

          {rail ? (
            <aside className="sticky top-[82px] hidden w-[236px] shrink-0 animate-fade-up xl:block" style={{ animationDelay: "80ms" }}>
              {rail}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
