import { ProgressDots } from "@/components/ui/ProgressDots";
import { plural } from "@/lib/utils";

interface TrackProgressProps {
  total: number;
  completed: number;
}

export function TrackProgress({ total, completed }: TrackProgressProps) {
  const remaining = total - completed;

  return (
    <div className="h-full rounded-[30px] border border-white/80 bg-white/[0.82] p-7 shadow-card backdrop-blur-xl">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Progress snapshot</p>
      <div className="mt-5 flex items-end gap-3">
        <span className="font-display text-[3.25rem] leading-none text-brand-ink">{completed}</span>
        <div className="pb-1">
          <p className="text-ui font-semibold text-text-primary">of {total} modules complete</p>
          <p className="text-caption text-text-muted">Your guided path updates as you move.</p>
        </div>
      </div>

      <ProgressDots total={total} completed={completed} className="mt-6" />

      <div className="mt-6 rounded-[24px] border border-border/80 bg-slate-950/[0.03] p-4">
        {remaining > 0 ? (
          <>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Next milestone</p>
            <p className="mt-2 text-ui text-text-secondary">
              {remaining} {plural(remaining, "module", "modules")} left to complete your onboarding path.
            </p>
          </>
        ) : (
          <>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-success">Complete</p>
            <p className="mt-2 text-ui text-text-secondary">Every published module on your path is complete. You can review any section whenever you need it.</p>
          </>
        )}
      </div>
    </div>
  );
}