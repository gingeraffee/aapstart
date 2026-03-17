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
  read: "Learn",
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
          shell: { color: "var(--status-progress)" },
          dot: "border-[#60bff0] bg-[linear-gradient(135deg,#d9f7ff_0%,#eaf6ff_100%)] text-[#0784c4] dark:border-[rgba(56,189,248,0.3)] dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.15)_0%,rgba(56,189,248,0.1)_100%)] dark:text-[#38bdf8]",
          label: String(index + 1),
        }
      : step.state === "complete"
        ? {
            shell: { color: "var(--status-complete)" },
            dot: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            label: "\u2713",
          }
        : {
            shell: { color: "var(--module-context)" },
            dot: "border-[#c4d5e9] bg-[rgba(27,44,86,0.06)] text-[#304e71] dark:border-[rgba(30,58,95,0.5)] dark:bg-[rgba(56,189,248,0.06)] dark:text-[#6b8bb5]",
            label: String(index + 1),
          };

  return (
    <div className="inline-flex items-center gap-2 text-[0.71rem] font-semibold transition-colors duration-200" style={styles.shell}>
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
        "overflow-hidden rounded-[16px] transition-shadow duration-200",
        !noPadding && "px-7 py-7 md:px-8",
        className
      )}
      style={{
        background: "var(--module-panel-bg)",
        border: "1px solid var(--module-panel-border)",
        boxShadow: "var(--module-panel-shadow)",
      }}
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
    <div
      className="flex flex-col gap-3 rounded-[14px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: "var(--module-footer-bg)",
        border: "1px solid var(--module-footer-border)",
        boxShadow: "var(--module-footer-shadow)",
      }}
    >
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold transition-colors" style={{ color: "var(--module-context)" }}>
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
        {helperText ? <p className="text-[0.73rem]" style={{ color: "var(--module-context)" }}>{helperText}</p> : null}
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
    <div className="w-full px-6 py-7 font-sans lg:px-8 lg:py-9">
      <div className="mx-auto w-full max-w-[1160px]">
        <div className="flex items-start gap-7">
          <div className="min-w-0 flex-1 space-y-6 animate-fade-up">
            <div className="flex flex-wrap items-center gap-2 text-[0.8rem]" style={{ color: "var(--module-context)" }}>
              {breadcrumbs.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {item.href ? (
                    <Link href={item.href} className="transition-colors hover:opacity-80">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-semibold" style={{ color: "var(--heading-color)" }}>{item.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                </div>
              ))}
            </div>

            <section
              className="relative overflow-hidden rounded-[20px]"
              style={{
                background: "var(--module-header-bg)",
                border: "1px solid var(--module-header-border)",
                boxShadow: "var(--module-header-shadow)",
              }}
            >
              <div className="h-1 w-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_52%,#df0030_100%)]" />
              <div
                className="pointer-events-none absolute -right-20 top-5 h-44 w-44 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(15,127,179,0.16) 0%, rgba(15,127,179,0) 72%)" }}
              />
              <div
                className="pointer-events-none absolute -left-10 bottom-2 h-28 w-28 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(223,0,48,0.12) 0%, rgba(223,0,48,0) 72%)" }}
              />
              <div
                className="pointer-events-none absolute right-7 top-8 hidden h-20 w-20 rounded-[16px] md:block"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(19, 98, 154, 0.15) 0.8px, transparent 1px)",
                  backgroundSize: "11px 11px",
                }}
              />

              <div className="relative px-7 pb-9 pt-7 md:px-8 md:pb-10 md:pt-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div
                    className="inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: "var(--module-pill-border)",
                      background: "var(--module-pill-bg)",
                    }}
                  >
                    <span className="rounded-full bg-[linear-gradient(135deg,#17365d_0%,#0f7fb3_70%,#21b8e7_100%)] px-2.5 py-1 text-[0.63rem] font-bold uppercase tracking-[0.09em] text-white">
                      Module {String(moduleOrder).padStart(2, "0")}
                    </span>
                    <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--welcome-label-text)" }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
                      {stageLabel}
                    </span>
                  </div>

                  <div
                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border md:flex"
                    style={{
                      borderColor: "var(--module-icon-border)",
                      background: "var(--module-icon-bg)",
                    }}
                    aria-hidden="true"
                  >
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#0784c4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="10" cy="10" r="7" />
                      <circle cx="10" cy="10" r="2.3" />
                      <path d="M10 3v2.2M17 10h-2.2M10 17v-2.2M3 10h2.2" />
                    </svg>
                  </div>
                </div>

                <h1 className="mt-2 text-[clamp(1.52rem,2.5vw,2.02rem)] font-bold leading-[1.14] tracking-[-0.012em]" style={{ color: "var(--module-headline)", fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                  {headline}
                </h1>
                <p className="mt-2.5 max-w-[700px] text-[0.94rem] leading-[1.72]" style={{ color: "var(--module-body)" }}>{description}</p>
                {contextNote ? (
                  <p className="mt-2 text-[0.8rem] font-medium" style={{ color: "var(--module-context)" }}>
                    Context: {contextNote}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {typeof estimatedMinutes === "number" ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.77rem] font-medium"
                      style={{ background: "var(--module-time-bg)", color: "var(--module-time-text)" }}
                    >
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
                        {index < steps.length - 1 ? <span className="h-px w-3 rounded-full" style={{ background: "var(--module-step-divider)" }} /> : null}
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
