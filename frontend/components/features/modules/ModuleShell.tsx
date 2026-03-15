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
          shell: "bg-[linear-gradient(135deg,#df0030_0%,#0f7fb3_100%)] text-white border-transparent",
          dot: "bg-white/25 text-white",
          label: String(index + 1),
        }
      : step.state === "complete"
        ? {
            shell: "bg-emerald-100 text-emerald-700 border-emerald-200",
            dot: "bg-emerald-200 text-emerald-700",
            label: "OK",
          }
        : {
            shell: "bg-cyan-50 text-brand-action border-cyan-100",
            dot: "bg-cyan-100 text-brand-action",
            label: String(index + 1),
          };

  return (
    <div className={cn("inline-flex h-[24px] items-center gap-1.5 rounded-full border px-2.5 text-[0.62rem] font-bold uppercase tracking-[0.06em]", styles.shell)}>
      <span className={cn("flex h-[13px] w-[13px] items-center justify-center rounded-full text-[0.48rem] font-black", styles.dot)}>
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
        "overflow-hidden rounded-[18px] border border-[#d6deeb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_16px_28px_rgba(12,24,47,0.09)]",
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
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#d6deeb] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
              "inline-flex h-[2.8rem] items-center rounded-button px-6 text-[0.88rem] font-bold text-white shadow-[0_10px_20px_rgba(223,0,48,0.22),0_5px_12px_rgba(15,127,179,0.16)] transition-all duration-200 hover:-translate-y-px",
              "bg-[linear-gradient(135deg,#df0030_0%,#c6002a_45%,#0f7fb3_100%)]"
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
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1160px]">
        <div className="flex items-start gap-5">
          <div className="min-w-0 flex-1 space-y-5 animate-fade-up">
            <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-text-muted">
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

            <section className="relative overflow-hidden rounded-[20px] border border-[#bcd6ea] bg-[linear-gradient(145deg,#ffffff_0%,#f3f9ff_62%,#fff5f7_100%)] shadow-[0_18px_32px_rgba(12,24,47,0.12),0_5px_10px_rgba(12,24,47,0.08)]">
              <div className="h-1.5 w-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_46%,#df0030_100%)]" />
              <div className="px-7 pb-6 pt-5">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-brand-action">
                  Module {String(moduleOrder).padStart(2, "0")} - {stageLabel}
                </p>
                <h1 className="mt-1.5 text-[clamp(1.45rem,2.5vw,1.95rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-text-primary">
                  {headline}
                </h1>
                <p className="mt-2 max-w-[680px] text-[0.9rem] leading-[1.66] text-text-secondary">{description}</p>
                {contextNote ? (
                  <p className="mt-2 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-text-muted">
                    From: {contextNote}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {typeof estimatedMinutes === "number" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-cyan-100 bg-cyan-50 px-3 py-1 text-[0.72rem] font-semibold text-brand-action">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <circle cx="6" cy="6" r="4.5" />
                        <path d="M6 3.5v2.5l1.5 1" />
                      </svg>
                      ~{estimatedMinutes} {plural(estimatedMinutes, "min", "mins")}
                    </span>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {steps.map((step, index) => (
                      <div key={step.key} className="flex items-center gap-1.5">
                        <StepPill step={step} index={index} />
                        {index < steps.length - 1 ? <span className="text-[0.72rem] text-[#7fb8d8]">-&gt;</span> : null}
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
            <aside className="sticky top-[78px] hidden w-[220px] shrink-0 animate-fade-up xl:block" style={{ animationDelay: "80ms" }}>
              {rail}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
