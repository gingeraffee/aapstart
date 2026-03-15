"use client";

const PHASES = [
  {
    range: "Days 1-30",
    label: "Get Grounded",
    tagline: "Orient yourself, set up your tools, and understand the landscape.",
    accent: "#0f7fb3",
    accentSoft: "rgba(15,127,179,0.08)",
    accentBorder: "rgba(15,127,179,0.25)",
    number: "01",
    milestones: [
      {
        heading: "Complete your onboarding modules",
        body: "Work through every module in AAP Start. This is your foundation for confidence and speed.",
      },
      {
        heading: "Get set up in every platform",
        body: "Activate your accounts in BambooHR, Paylocity, and LinkedIn Learning, then validate access end-to-end.",
      },
      {
        heading: "Meet your team and key contacts",
        body: "Connect with teammates and support partners so you always know who to contact and when.",
      },
      {
        heading: "Learn the AAP mission and structure",
        body: "Understand what AAP does, who it serves, and where your role contributes the most value.",
      },
      {
        heading: "Clarify immediate priorities",
        body: "By week one, you should have clear near-term goals and know what success looks like this month.",
      },
    ],
  },
  {
    range: "Days 31-60",
    label: "Find Your Footing",
    tagline: "Start contributing, build relationships, and grow your confidence.",
    accent: "#1b2c56",
    accentSoft: "rgba(27,44,86,0.08)",
    accentBorder: "rgba(27,44,86,0.24)",
    number: "02",
    milestones: [
      {
        heading: "Handle routine tasks independently",
        body: "Process core HR functions with less guidance and better speed.",
      },
      {
        heading: "Deepen policy knowledge",
        body: "Move from reading policy to applying it in real scenarios and edge cases.",
      },
      {
        heading: "Build cross-functional relationships",
        body: "Strengthen trust with teams you support so collaboration gets easier.",
      },
      {
        heading: "Attend and contribute to meetings",
        body: "Share observations, ask sharper questions, and start adding your perspective.",
      },
      {
        heading: "Surface what you are learning",
        body: "Use check-ins to close knowledge gaps while momentum is high.",
      },
    ],
  },
  {
    range: "Days 61-90",
    label: "Own Your Role",
    tagline: "Operate with confidence, add real value, and set your trajectory.",
    accent: "#df0030",
    accentSoft: "rgba(223,0,48,0.08)",
    accentBorder: "rgba(223,0,48,0.24)",
    number: "03",
    milestones: [
      {
        heading: "Operate independently on core functions",
        body: "Own responsibilities end-to-end with minimal hand-holding.",
      },
      {
        heading: "Identify one improvement opportunity",
        body: "Bring one practical process improvement backed by what you have observed.",
      },
      {
        heading: "Complete remaining compliance training",
        body: "Make sure all required learning is completed and recorded.",
      },
      {
        heading: "Establish your regular rhythm",
        body: "Lock in repeatable workflows that support quality and consistency.",
      },
      {
        heading: "Reflect and set goals for month four",
        body: "Review wins, lessons learned, and next priorities with your manager.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-8 animate-fade-up">
        <p className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#64748b]">Your First 90 Days</p>
        <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.03em] text-[#0b1220]">A premium roadmap to confident onboarding</h1>
        <p className="mt-2 max-w-2xl text-[0.9rem] leading-[1.7] text-[#475569]">
          This is your growth arc, not a compliance checklist. It shows what strong momentum looks like at each stage and keeps your next steps obvious.
        </p>
      </div>

      <div className="space-y-5">
        {PHASES.map((phase, phaseIdx) => (
          <div
            key={phase.range}
            className="overflow-hidden rounded-[20px] animate-fade-up"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              border: `1.5px solid ${phase.accentBorder}`,
              boxShadow: "0 18px 30px rgba(12, 24, 47, 0.1)",
              animationDelay: `${phaseIdx * 80}ms`,
            }}
          >
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${phase.accent} 0%, #06b6d4 100%)` }} />

            <div
              className="flex items-center gap-5 px-7 py-5"
              style={{ backgroundColor: phase.accentSoft, borderBottom: `1px solid ${phase.accentBorder}` }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] text-[1.1rem] font-black text-white"
                style={{ background: `linear-gradient(135deg, ${phase.accent} 0%, #0f7fb3 100%)` }}
              >
                {phase.number}
              </div>
              <div>
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em]" style={{ color: phase.accent }}>
                  {phase.range}
                </p>
                <h2 className="mt-0.5 text-[1.15rem] font-extrabold tracking-[-0.02em] text-[#0b1220]">{phase.label}</h2>
                <p className="mt-0.5 text-[0.82rem] text-[#475569]">{phase.tagline}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 px-7">
              {phase.milestones.map((m, i) => (
                <div key={i} className="flex gap-4 py-4">
                  <div className="mt-1 shrink-0">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: phase.accent, opacity: 0.8 }} />
                  </div>
                  <div>
                    <p className="text-[0.87rem] font-semibold leading-snug text-[#0b1220]">{m.heading}</p>
                    <p className="mt-1 text-[0.8rem] leading-[1.65] text-[#475569]">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-6 rounded-[14px] px-6 py-4 animate-fade-up"
        style={{
          background: "linear-gradient(180deg, rgba(6,182,212,0.08) 0%, rgba(223,0,48,0.06) 100%)",
          border: "1px solid rgba(15,127,179,0.2)",
          animationDelay: "280ms",
        }}
      >
        <p className="text-[0.8rem] leading-[1.65] text-[#334155]">
          <span className="font-semibold text-[#0b1220]">Timing note:</span> onboarding modules are expected to be completed in your first week.
          The 30-60-90 plan reflects your broader growth trajectory across your first three months.
        </p>
      </div>
    </div>
  );
}
