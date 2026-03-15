"use client";

import { useMemo } from "react";
import { pickRandom } from "@/lib/utils";
import type { ModuleSummary } from "@/lib/types";

const FALLBACK_HEADERS = [
  "Good to see you, {name}! 👋",
  "Ready when you are, {name}.",
  "Let's pick up where you left off, {name}!",
  "Welcome back, {name}. You've got this.",
  "Your path is waiting, {name} — let's go!",
  "Hey {name}! Great to have you here.",
  "Look who showed up, {name}. Let's do this.",
  "One step at a time, {name}. You're doing great.",
];

const MOTIVATIONAL_LINES = [
  "One module at a time. That's all.",
  "Progress beats perfection. Always.",
  "You're already ahead of where you started.",
  "Small steps. Real progress.",
  "Every expert was once right where you are.",
  "You've got this — and we've got you.",
  "Learning is the work. Keep going.",
  "The journey started. That's the hardest part.",
  "Show up curious. The rest follows.",
  "Keep going. You're building something real.",
];

interface WelcomeHeaderProps {
  name: string;
  headers?: string[];
  currentModule?: ModuleSummary;
  completedCount: number;
  totalCount: number;
  comingSoonCount?: number;
}

export function WelcomeHeader({
  name,
  headers,
  currentModule,
  completedCount,
  totalCount,
}: WelcomeHeaderProps) {
  const firstName = name.split(" ")[0] ?? name;
  const pool = headers && headers.length > 0 ? headers : FALLBACK_HEADERS;
  const raw = useMemo(() => pickRandom(pool), [pool]);
  const headline = raw.replace("{name}", firstName);
  const motivationalLine = useMemo(() => pickRandom(MOTIVATIONAL_LINES), []);
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remaining = totalCount - completedCount;

  return (
    // Change 10: stronger shadow + distinct border to pop against page bg
    <div
      className="relative overflow-hidden rounded-[20px]"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%)",
        boxShadow: "0 4px 24px rgba(14,118,189,0.14), 0 1px 6px rgba(0,0,0,0.08)",
        border: "1px solid rgba(14,118,189,0.18)",
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, #0e76bd 0%, #5d9fd2 50%, #22c55e 100%)" }}
      />

      <div className="px-7 pt-6 pb-6">
        {/* Eyebrow */}
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ color: "#0e76bd" }}>
          AAP Start
        </p>

        {/* Headline — main focus, large */}
        <h1 className="mt-2 text-[clamp(1.9rem,3vw,2.6rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-text-primary">
          {headline}
        </h1>

        {/* Description */}
        <p className="mt-2.5 max-w-[560px] text-[0.88rem] leading-[1.65] text-text-secondary">
          AAP Start turns the early onboarding stretch into a guided system so you can build confidence, keep momentum, and know exactly what comes next.
        </p>

        {/* Change 4+5: bottom strip — compact, celebratory, encouraging at 0% */}
        <div
          className="mt-5 flex items-center gap-5 rounded-[14px] px-5 py-4"
          style={{ backgroundColor: "rgba(14,118,189,0.06)", border: "1px solid rgba(14,118,189,0.1)" }}
        >
          {/* Flame + count */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[1.35rem] leading-none">🔥</span>
            <div>
              <p className="text-[1.05rem] font-extrabold leading-tight text-text-primary">
                {completedCount}
                <span className="ml-1 text-[0.72rem] font-semibold text-text-muted">of {totalCount}</span>
              </p>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-text-muted">modules done</p>
            </div>
          </div>

          <div className="h-9 w-px shrink-0" style={{ backgroundColor: "rgba(14,118,189,0.18)" }} />

          {/* Change 4: progress bar — thicker, starter pulse at 0%, gradient fill */}
          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-text-muted">
                {pct === 0 ? "Ready to begin? 🎯" : "Progress"}
              </p>
              <p
                className="text-[0.72rem] font-extrabold"
                style={{ color: pct > 0 ? "#0e76bd" : "#9ca3af" }}
              >
                {pct}%
              </p>
            </div>
            <div
              className="relative h-3 overflow-hidden rounded-full"
              style={{ backgroundColor: "rgba(14,118,189,0.12)" }}
            >
              {pct > 0 ? (
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0e76bd, #22c55e)" }}
                />
              ) : (
                // Encouraging pulse at 0% — shows the bar isn't empty, just waiting
                <div
                  className="h-full w-5 animate-pulse rounded-full"
                  style={{ background: "linear-gradient(90deg, #0e76bd, #5d9fd2)", opacity: 0.5 }}
                />
              )}
            </div>
            <p className="mt-1 text-[0.63rem] text-text-muted">
              {completedCount === 0
                ? "Start Module 1 to begin tracking your progress"
                : `${completedCount} complete · ${remaining} to go`}
            </p>
          </div>

          <div className="h-9 w-px shrink-0" style={{ backgroundColor: "rgba(14,118,189,0.18)" }} />

          {/* Motivational line */}
          <p className="hidden max-w-[165px] text-[0.73rem] font-semibold italic text-text-secondary lg:block">
            &ldquo;{motivationalLine}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
