import { cn } from "@/lib/utils";

type Step = "module" | "acknowledge" | "quiz" | "complete";

interface StepIndicatorProps {
  current: Step;
  requiresAcknowledgement: boolean;
  requiresQuiz: boolean;
}

export function StepIndicator({ current, requiresAcknowledgement, requiresQuiz }: StepIndicatorProps) {
  type StepDef = { key: Step; label: string };

  const steps: StepDef[] = [
    { key: "module", label: "Learn" },
    ...(requiresAcknowledgement ? [{ key: "acknowledge" as Step, label: "Confirm" }] : []),
    ...(requiresQuiz ? [{ key: "quiz" as Step, label: "Quiz" }] : []),
    { key: "complete", label: "Done" },
  ];

  const currentIdx = steps.findIndex((step) => step.key === current);

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/6 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-0">
        {steps.map((step, index) => {
          const done = index < currentIdx;
          const active = index === currentIdx;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex flex-1 items-center gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold transition-all duration-200",
                    done && "border-success/30 bg-success text-white shadow-[0_12px_24px_rgba(31,143,84,0.18)]",
                    active && "border-brand-action/30 bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] text-white shadow-[0_14px_28px_rgba(36,54,115,0.24)]",
                    !done && !active && "border-white/12 bg-white/6 text-white/62"
                  )}
                >
                  {done ? (
                    <svg className="h-4 w-4" viewBox="0 0 12 10" fill="none" aria-hidden>
                      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/45">Step {index + 1}</p>
                  <p className={cn("text-ui font-semibold", active || done ? "text-white" : "text-white/72")}>{step.label}</p>
                </div>
              </div>

              {!isLast && (
                <div className="mx-3 hidden h-px flex-1 bg-gradient-to-r from-white/25 via-white/10 to-transparent md:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}