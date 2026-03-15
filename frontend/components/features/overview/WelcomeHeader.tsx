"use client";

import Link from "next/link";
import { useMemo } from "react";
import { pickRandom } from "@/lib/utils";
import type { ModuleSummary } from "@/lib/types";

const FALLBACK_HEADERS = [
  "Good to see you, {name}.",
  "Ready when you are, {name}.",
  "Let's pick up where you left off, {name}.",
  "Welcome back, {name}. You have this.",
  "Your path is waiting, {name}.",
  "Hey {name}. Great to have you here.",
  "One step at a time, {name}.",
];

const MOTIVATIONAL_LINES = [
  "One module at a time. That is all.",
  "Progress beats perfection.",
  "Small steps. Real progress.",
  "You are building momentum.",
  "Keep going. You are doing great.",
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
  const remaining = Math.max(totalCount - completedCount, 0);
  const activeDay = totalCount > 0 ? Math.min(completedCount + 1, totalCount) : 1;
  const isComplete = totalCount > 0 && completedCount >= totalCount;

  const ctaHref = currentModule ? `/modules/${currentModule.slug}` : "/roadmap";
  const ctaLabel = currentModule ? "Pick up where you left off" : "Open your roadmap";

  return (
    <div
      className="relative overflow-hidden rounded-[24px] p-7 lg:p-8"
      style={{
        background:
          "radial-gradient(580px 220px at 0% -20%, rgba(34,211,238,0.26) 0%, rgba(34,211,238,0) 62%), radial-gradient(420px 220px at 100% -10%, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0) 58%), linear-gradient(160deg, #0a1f3d 0%, #0e2a52 44%, #0a2446 72%, #121f3d 100%)",
        border: "1px solid rgba(142, 196, 255, 0.26)",
        boxShadow: "0 28px 64px rgba(2, 8, 20, 0.48), 0 12px 30px rgba(8, 22, 45, 0.28)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[4px]"
        style={{ background: "linear-gradient(90deg, #0ea5d9 0%, #22d3ee 58%, #c92f58 100%)" }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-cyan-100/90">AAP Start</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1"
          style={{
            backgroundColor: "rgba(14,165,233,0.14)",
            border: "1px solid rgba(147, 227, 255, 0.32)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-200" />
          <span className="text-[0.67rem] font-semibold text-cyan-100">
            {isComplete ? "All modules complete" : `Day ${activeDay} of ${totalCount || 1}`}
          </span>
        </div>
      </div>

      <h1 className="mt-2 text-[clamp(2rem,3vw,2.8rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-white">
        {headline}
      </h1>

      <p className="mt-2.5 max-w-[640px] text-[0.93rem] leading-[1.7] text-slate-200">
        This is not a checklist grind. It is your launchpad. One clear step at a time, with real momentum.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.79rem] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "linear-gradient(140deg, #102c55 0%, #163f71 60%, #12568a 100%)",
            border: "1px solid rgba(147, 227, 255, 0.34)",
            boxShadow: "0 14px 28px rgba(3, 11, 26, 0.45)",
          }}
        >
          {ctaLabel}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6h8" />
            <path d="M6.5 2.5L10 6l-3.5 3.5" />
          </svg>
        </Link>
        <p className="text-[0.73rem] font-medium text-cyan-100/88">
          {currentModule ? `Up next: ${currentModule.title}` : "You have completed every module in this path."}
        </p>
      </div>

      <div
        className="mt-6 rounded-[15px] px-5 py-4"
        style={{
          background: "linear-gradient(160deg, rgba(11,32,63,0.7) 0%, rgba(9,25,51,0.78) 100%)",
          border: "1px solid rgba(137, 192, 255, 0.26)",
          boxShadow: "inset 0 1px 0 rgba(170, 218, 255, 0.18)",
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[126px]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-cyan-100/75">Modules done</p>
            <p className="mt-1 text-[1.12rem] font-extrabold leading-tight text-white">
              {completedCount}
              <span className="ml-1 text-[0.75rem] font-semibold text-cyan-100/75">of {totalCount}</span>
            </p>
          </div>

          <div className="h-10 w-px bg-cyan-200/30" />

          <div className="min-w-[210px] flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-cyan-100/75">Progress</p>
              <p className="text-[0.78rem] font-extrabold text-cyan-100">{pct}%</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-cyan-950/70 ring-1 ring-cyan-300/20">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(pct, 6)}%`,
                  background: "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 52%, #c92f58 100%)",
                  opacity: pct === 0 ? 0.35 : 1,
                }}
              />
            </div>
            <p className="mt-1 text-[0.67rem] text-cyan-100/72">
              {completedCount === 0
                ? "Start Module 1 to kick off your progress tracker."
                : isComplete
                  ? "Every module complete. You can review anything anytime."
                  : `${completedCount} complete, ${remaining} to go.`}
            </p>
          </div>

          <div className="hidden min-w-[190px] text-[0.73rem] font-semibold italic text-cyan-100/82 lg:block">
            "{motivationalLine}"
          </div>
        </div>
      </div>
    </div>
  );
}
