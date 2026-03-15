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
          "radial-gradient(600px 240px at 0% -20%, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0) 62%), radial-gradient(420px 220px at 100% -10%, rgba(244,63,94,0.12) 0%, rgba(244,63,94,0) 58%), linear-gradient(150deg, #fbfdff 0%, #f2f8ff 58%, #fff8fa 100%)",
        border: "1px solid rgba(139, 174, 224, 0.34)",
        boxShadow: "0 22px 50px rgba(18, 39, 71, 0.15), 0 8px 18px rgba(18, 39, 71, 0.08)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[4px]"
        style={{ background: "linear-gradient(90deg, #0ea5d9 0%, #22d3ee 58%, #d63964 100%)" }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#1f5a92]">AAP Start</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1"
          style={{
            backgroundColor: "rgba(14,165,233,0.1)",
            border: "1px solid rgba(14,165,233,0.24)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#1593c3]" />
          <span className="text-[0.67rem] font-semibold text-[#20598f]">
            {isComplete ? "All modules complete" : `Day ${activeDay} of ${totalCount || 1}`}
          </span>
        </div>
      </div>

      <h1 className="mt-2 text-[clamp(2rem,3vw,2.8rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-[#0f1d38]">
        {headline}
      </h1>

      <p className="mt-2.5 max-w-[640px] text-[0.93rem] leading-[1.7] text-[#3c516e]">
        This is not a checklist grind. It is your launchpad. One clear step at a time, with real momentum.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.79rem] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "linear-gradient(140deg, #123867 0%, #15548a 70%, #1a679b 100%)",
            border: "1px solid rgba(110, 173, 234, 0.4)",
            boxShadow: "0 12px 24px rgba(16, 45, 81, 0.24)",
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
        <p className="text-[0.73rem] font-medium text-[#526c8e]">
          {currentModule ? `Up next: ${currentModule.title}` : "You have completed every module in this path."}
        </p>
      </div>

      <div
        className="mt-6 rounded-[15px] px-5 py-4"
        style={{
          background: "linear-gradient(170deg, rgba(226,242,255,0.68) 0%, rgba(244,250,255,0.9) 100%)",
          border: "1px solid rgba(140, 186, 241, 0.28)",
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[126px]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#5d7391]">Modules done</p>
            <p className="mt-1 text-[1.12rem] font-extrabold leading-tight text-[#102445]">
              {completedCount}
              <span className="ml-1 text-[0.75rem] font-semibold text-[#667f9f]">of {totalCount}</span>
            </p>
          </div>

          <div className="h-10 w-px bg-[#b8d7f9]" />

          <div className="min-w-[210px] flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#5d7391]">Progress</p>
              <p className="text-[0.78rem] font-extrabold text-[#0f6092]">{pct}%</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#d7e8fb]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(pct, 6)}%`,
                  background: "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 52%, #d63964 100%)",
                  opacity: pct === 0 ? 0.35 : 1,
                }}
              />
            </div>
            <p className="mt-1 text-[0.67rem] text-[#627a9a]">
              {completedCount === 0
                ? "Start Module 1 to kick off your progress tracker."
                : isComplete
                  ? "Every module complete. You can review anything anytime."
                  : `${completedCount} complete, ${remaining} to go.`}
            </p>
          </div>

          <div className="hidden min-w-[190px] text-[0.73rem] font-semibold italic text-[#3d5677] lg:block">
            "{motivationalLine}"
          </div>
        </div>
      </div>
    </div>
  );
}
