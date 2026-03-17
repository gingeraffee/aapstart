"use client";

const PHASES = [
  {
    range: "Days 1-30",
    chapter: "Chapter 01",
    title: "Get Grounded",
    subtitle: "Set your foundation, build your context, and make your first month feel clear.",
    focus: "Focus: orientation, access, people, and first priorities.",
    accent: "#0f7fb3",
    accentSoft: "rgba(15,127,179,0.09)",
    border: "rgba(15,127,179,0.28)",
    checkpoints: [
      "Finish the onboarding modules and lock in the core basics.",
      "Activate every key platform and test access end to end.",
      "Build early relationships with your team and support partners.",
      "Align with your manager on first-month outcomes.",
    ],
  },
  {
    range: "Days 31-60",
    chapter: "Chapter 02",
    title: "Find Your Rhythm",
    subtitle: "Start contributing with confidence and turn knowledge into steady execution.",
    focus: "Focus: independent execution, collaboration, and better judgment.",
    accent: "#1f4f84",
    accentSoft: "rgba(31,79,132,0.09)",
    border: "rgba(31,79,132,0.28)",
    checkpoints: [
      "Handle routine responsibilities with less hand-holding.",
      "Apply policy decisions in real, practical scenarios.",
      "Contribute actively in team conversations and weekly check-ins.",
      "Capture what is still unclear and close those gaps quickly.",
    ],
  },
  {
    range: "Days 61-90",
    chapter: "Chapter 03",
    title: "Own Your Lane",
    subtitle: "Operate with consistency, add value, and shape your next chapter.",
    focus: "Focus: ownership, impact, and month-four direction.",
    accent: "#c43a5d",
    accentSoft: "rgba(196,58,93,0.1)",
    border: "rgba(196,58,93,0.28)",
    checkpoints: [
      "Run core responsibilities confidently and consistently.",
      "Share one improvement idea based on what you observed.",
      "Close out any required training and compliance items.",
      "Define your month-four goals with your manager.",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">
      <section
        className="relative overflow-hidden rounded-[24px] border px-7 py-7 animate-fade-up"
        style={{ borderColor: "var(--module-header-border)", background: "var(--card-bg)", boxShadow: "var(--card-shadow)" }}
      >
        <div className="absolute right-0 top-0 h-1 w-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_48%,#df0030_100%)]" />
        <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
          Your 90-day roadmap
        </p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.8vw,2.25rem)] font-extrabold leading-[1.08] tracking-[-0.03em]" style={{ color: "var(--heading-color)" }}>
          A guided path from day one to confident ownership
        </h1>
        <p className="mt-3 max-w-[760px] text-[0.92rem] leading-[1.72]" style={{ color: "var(--card-desc)" }}>
          This is your momentum map for the first three months. Use it to stay oriented, move with intention,
          and keep your next step obvious.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {PHASES.map((phase, idx) => (
            <div
              key={phase.range}
              className="rounded-[12px] border px-4 py-3"
              style={{ borderColor: phase.border, backgroundColor: phase.accentSoft, animationDelay: `${idx * 50}ms` }}
            >
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em]" style={{ color: phase.accent }}>
                {phase.range}
              </p>
              <p className="mt-1 text-[0.84rem] font-semibold" style={{ color: "var(--heading-color)" }}>{phase.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mt-7 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="pointer-events-none absolute left-[14px] top-2 hidden h-[calc(100%-1rem)] w-px bg-[linear-gradient(180deg,#9dc7ea_0%,#bcd8ef_50%,#e4d2da_100%)] md:block" />

        <div className="space-y-5">
          {PHASES.map((phase, idx) => (
            <article
              key={phase.range}
              className="relative rounded-[20px] border px-6 py-6"
              style={{ borderColor: phase.border, background: "var(--card-bg)", boxShadow: "var(--card-shadow)", animationDelay: `${120 + idx * 70}ms` }}
            >
              <span
                className="absolute left-[-18px] top-8 hidden h-5 w-5 rounded-full border-4 md:block"
                style={{ borderColor: phase.accent, backgroundColor: "var(--card-bg)" }}
              />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.15em]" style={{ color: phase.accent }}>
                    {phase.chapter}
                  </p>
                  <h2 className="mt-1 text-[1.22rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>{phase.title}</h2>
                  <p className="mt-1 text-[0.83rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>{phase.subtitle}</p>
                </div>
                <p
                  className="rounded-[10px] border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: phase.accent, borderColor: phase.border, backgroundColor: phase.accentSoft }}
                >
                  {phase.range}
                </p>
              </div>

              <p className="mt-3 text-[0.77rem] font-semibold" style={{ color: "var(--welcome-label-text)" }}>{phase.focus}</p>

              <ul className="mt-4 grid gap-x-5 gap-y-3 md:grid-cols-2">
                {phase.checkpoints.map((checkpoint) => (
                  <li key={checkpoint} className="flex items-start gap-2.5 text-[0.83rem] leading-[1.6]" style={{ color: "var(--module-body)" }}>
                    <span
                      className="mt-[0.45rem] h-[7px] w-[7px] shrink-0 rounded-full"
                      style={{ backgroundColor: phase.accent }}
                    />
                    <span>{checkpoint}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mt-6 rounded-[14px] border px-6 py-4 animate-fade-up"
        style={{ borderColor: "var(--module-panel-border)", background: "var(--card-bg)", animationDelay: "180ms" }}
      >
        <p className="text-[0.82rem] leading-[1.65]" style={{ color: "var(--card-desc)" }}>
          <span className="font-semibold" style={{ color: "var(--welcome-label-text)" }}>How to use this roadmap:</span> revisit it at the start of each week,
          check your current chapter, and align one clear priority with your manager.
        </p>
      </section>
    </div>
  );
}
