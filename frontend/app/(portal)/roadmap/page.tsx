"use client";

const PHASES = [
  {
    range: "Days 1–30",
    label: "Get Grounded",
    tagline: "Orient yourself, set up your tools, and understand the landscape.",
    accent: "#0e76bd",
    accentSoft: "rgba(14,118,189,0.08)",
    accentBorder: "rgba(14,118,189,0.22)",
    number: "01",
    milestones: [
      {
        heading: "Complete your onboarding modules",
        body: "Work through every module in AAP Start — from company culture and HR tools to your employee handbook and benefits. This is your foundation.",
      },
      {
        heading: "Get set up in every platform",
        body: "Activate your accounts in BambooHR, Paylocity, and LinkedIn Learning. Confirm you can log in, find your info, and submit time-off requests without help.",
      },
      {
        heading: "Meet your team and key contacts",
        body: "Connect with your direct teammates and the people you'll work alongside most. Know who to call for what.",
      },
      {
        heading: "Learn the AAP mission and structure",
        body: "Understand what AAP does, who it serves, and where your role fits in the bigger picture. Read through the organizational structure and ask questions.",
      },
      {
        heading: "Clarify your immediate priorities",
        body: "By the end of week one, you should know what's expected of you in the short term — and have a clear sense of what success looks like in your first month.",
      },
    ],
  },
  {
    range: "Days 31–60",
    label: "Find Your Footing",
    tagline: "Start contributing, build relationships, and grow your confidence.",
    accent: "#0d5fa3",
    accentSoft: "rgba(13,95,163,0.07)",
    accentBorder: "rgba(13,95,163,0.20)",
    number: "02",
    milestones: [
      {
        heading: "Handle routine tasks independently",
        body: "By now you should be processing core HR functions — onboarding paperwork, benefits questions, time-off routing — without needing to ask for help each time.",
      },
      {
        heading: "Deepen your policy knowledge",
        body: "You've read the handbook. Now start applying it. Work through real scenarios, ask about edge cases, and build your judgment around AAP's policies.",
      },
      {
        heading: "Build cross-functional relationships",
        body: "Introduce yourself to people in other departments. HR is a connector role — the more people know and trust you, the more effective you'll be.",
      },
      {
        heading: "Attend and contribute to meetings",
        body: "Don't just observe. Start sharing observations, asking thoughtful questions, and bringing your perspective to the table.",
      },
      {
        heading: "Surface what you're learning",
        body: "Share what's clicking and what's still fuzzy with Nicole or your manager. This is the right time to close any remaining knowledge gaps.",
      },
    ],
  },
  {
    range: "Days 61–90",
    label: "Own Your Role",
    tagline: "Operate with confidence, add real value, and set your trajectory.",
    accent: "#16803c",
    accentSoft: "rgba(22,128,60,0.07)",
    accentBorder: "rgba(22,128,60,0.20)",
    number: "03",
    milestones: [
      {
        heading: "Operate independently on core functions",
        body: "You should be the one others come to, not the one asking. Own your HR responsibilities end-to-end with minimal hand-holding.",
      },
      {
        heading: "Identify one improvement opportunity",
        body: "You've had 60 days of fresh eyes. What's one thing that could work better? A process, a communication, a workflow. Bring a specific, thoughtful suggestion.",
      },
      {
        heading: "Complete any remaining compliance training",
        body: "Confirm all required training through LinkedIn Learning or other assigned platforms is fully finished and logged.",
      },
      {
        heading: "Establish your regular rhythm",
        body: "You know your role, your tools, your team, and your calendar. By day 90 you should have a steady, repeatable workflow that doesn't rely on constant guidance.",
      },
      {
        heading: "Reflect and set goals for month four",
        body: "Schedule a check-in with Nicole. Talk through what went well, what you'd do differently, and what you want to focus on as you move beyond onboarding.",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">

      {/* ── Hero ── */}
      <div className="mb-8 animate-fade-up">
        <p className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-text-muted">
          Your First 90 Days
        </p>
        <h1 className="text-[1.65rem] font-extrabold tracking-[-0.025em] text-text-primary leading-tight">
          Your 90-day roadmap
        </h1>
        <p className="mt-2 max-w-2xl text-[0.88rem] leading-[1.7] text-text-secondary">
          This isn't a checklist — it's a framework. A clear picture of what the first three months look like,
          what's expected of you at each stage, and how you'll know you're on track.
          Use it as a reference, not a rulebook.
        </p>
      </div>

      {/* ── Phase cards ── */}
      <div className="space-y-5">
        {PHASES.map((phase, phaseIdx) => (
          <div
            key={phase.range}
            className="overflow-hidden rounded-[20px] animate-fade-up"
            style={{
              backgroundColor: "#ffffff",
              border: `1.5px solid ${phase.accentBorder}`,
              boxShadow: "0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
              animationDelay: `${phaseIdx * 80}ms`,
            }}
          >
            {/* Accent bar */}
            <div className="h-1.5 w-full" style={{ backgroundColor: phase.accent }} />

            {/* Phase header */}
            <div
              className="flex items-center gap-5 px-7 py-5"
              style={{ backgroundColor: phase.accentSoft, borderBottom: `1px solid ${phase.accentBorder}` }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] text-[1.1rem] font-black text-white"
                style={{ background: phase.accent }}
              >
                {phase.number}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p
                    className="text-[0.58rem] font-bold uppercase tracking-[0.18em]"
                    style={{ color: phase.accent }}
                  >
                    {phase.range}
                  </p>
                </div>
                <h2 className="mt-0.5 text-[1.15rem] font-extrabold tracking-[-0.02em] text-text-primary">
                  {phase.label}
                </h2>
                <p className="mt-0.5 text-[0.81rem] text-text-secondary">{phase.tagline}</p>
              </div>
            </div>

            {/* Milestones */}
            <div className="divide-y divide-gray-100 px-7">
              {phase.milestones.map((m, i) => (
                <div key={i} className="flex gap-4 py-4">
                  {/* Dot */}
                  <div className="mt-1 shrink-0">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: phase.accent, opacity: 0.7 }}
                    />
                  </div>
                  <div>
                    <p className="text-[0.86rem] font-semibold leading-snug text-text-primary">
                      {m.heading}
                    </p>
                    <p className="mt-1 text-[0.79rem] leading-[1.65] text-text-secondary">
                      {m.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer note ── */}
      <div
        className="mt-6 rounded-[14px] px-6 py-4 animate-fade-up"
        style={{
          backgroundColor: "rgba(14,118,189,0.05)",
          border: "1px solid rgba(14,118,189,0.12)",
          animationDelay: "280ms",
        }}
      >
        <p className="text-[0.8rem] leading-[1.65] text-text-secondary">
          <span className="font-semibold text-text-primary">A note on timing:</span>{" "}
          Onboarding is expected to be completed within your first week of employment.
          The 30-60-90 framework reflects your broader growth arc — not a rigid timeline.
          If you have questions about where you stand, Nicole Thornton is your first call.
        </p>
      </div>

    </div>
  );
}
