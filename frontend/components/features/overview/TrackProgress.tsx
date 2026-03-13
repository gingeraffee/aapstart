interface TrackProgressProps {
  total: number;
  completed: number;
}

export function TrackProgress({ total, completed }: TrackProgressProps) {
  const remaining = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] bg-brand-ink p-7 text-white">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white/45">
        Your Progress
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <span className="text-[2.5rem] font-extrabold leading-none text-accent">{completed}</span>
          <p className="mt-1 text-[0.8rem] text-white/60">completed</p>
        </div>
        <div>
          <span className="text-[2.5rem] font-extrabold leading-none text-white">{remaining}</span>
          <p className="mt-1 text-[0.8rem] text-white/60">remaining</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[0.7rem] text-white/45">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
