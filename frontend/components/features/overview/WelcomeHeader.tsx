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
        background: "linear-gradient(180deg, #fffefb 0%, #f8fbff 100%)",
        border: "1px solid rgba(118, 171, 224, 0.42)",
        boxShadow: "0 18px 38px rgba(18, 39, 71, 0.12), 0 6px 14px rgba(18, 39, 71, 0.08)",
      }}
    >
      <div className="pointer-events-none absolute -right-9 -top-9 h-28 w-28 rounded-full border border-[#cadff5]" />
      <div className="pointer-events-none absolute -right-3 top-4 h-14 w-14 rounded-full border border-[#d3e4f7]" />
      <div className="pointer-events-none absolute right-12 top-14 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(223,0,48,0.08)_0%,rgba(223,0,48,0)_72%)]" />
      <div
        className="absolute inset-x-0 top-0 h-[4px]"
        style={{ background: "linear-gradient(90deg, #0ea5d9 0%, #22d3ee 58%, #d63964 100%)" }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(27,44,86,0.08)] px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#17365d]">
          <span className="h-2 w-2 rounded-full bg-[#df0030]" />
          AAP Start
        </p>
        <div className="rounded-full border border-[rgba(72,188,246,0.35)] bg-[rgba(14,165,233,0.08)] px-3 py-1 text-[0.67rem] font-semibold text-[#0d5f91]">
          {isComplete ? "All modules complete" : `Day ${activeDay} of ${totalCount || 1}`}
        </div>
      </div>

      <h1 className="mt-2 text-[clamp(2rem,3vw,2.8rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-[#0f1d38]">
        {headline}
      </h1>

      <p className="mt-2.5 max-w-[620px] text-[0.93rem] leading-[1.68] text-[#334f72]">
        One clear step at a time. Your launch path is built to keep momentum steady, practical, and easy to follow.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.79rem] font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_20px_rgba(16,45,81,0.24)]"
            style={{
              background: "linear-gradient(140deg, #17365d 0%, #0f7fb3 74%, #21b8e7 100%)",
              border: "1px solid rgba(98, 185, 241, 0.52)",
              boxShadow: "0 8px 16px rgba(16, 45, 81, 0.22)",
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
          <p className="text-[0.73rem] font-medium text-[#4f688a]">
            {currentModule ? `Up next: ${currentModule.title}` : "Every module in this journey is complete."}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-[11px] px-3 py-2 text-[0.71rem] font-semibold text-[#245784]"
          style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.14) 0%, rgba(14,165,233,0.08) 100%)", border: "1px solid rgba(111, 173, 230, 0.42)" }}
        >
          <span className="h-2 w-2 rounded-full bg-[#0ea5d9]" />
          {isComplete ? "Journey wrapped" : `${remaining} module${remaining === 1 ? "" : "s"} left`}
        </div>
      </div>

      <div
        className="mt-5 rounded-[15px] px-5 py-3.5"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(246,250,255,0.95) 100%)",
          border: "1px solid rgba(129, 175, 222, 0.54)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.65)",
        }}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="min-w-[112px]">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#5d7391]">Completed</p>
            <p className="mt-1 text-[1.05rem] font-extrabold leading-tight text-[#102445]">
              {completedCount}
              <span className="ml-1 text-[0.75rem] font-semibold text-[#667f9f]">of {totalCount}</span>
            </p>
          </div>

          <div className="min-w-[230px] flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#17365d]">Progress</p>
              <p className="text-[0.78rem] font-extrabold text-[#0c78b7]">{pct}%</p>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-[#d2e2f3]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(pct, 6)}%`,
                  background: pct > 75
                    ? "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 45%, #d63964 100%)"
                    : "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 100%)",
                  opacity: pct === 0 ? 0.35 : 1,
                }}
              />
              <div className="pointer-events-none absolute inset-0 hidden items-center justify-between px-[25%] md:flex">
                <span className="h-2 w-px bg-white/60" />
                <span className="h-2 w-px bg-white/60" />
                <span className="h-2 w-px bg-white/60" />
              </div>
            </div>
            <p className="mt-1.5 text-[0.68rem] text-[#556f90]">
              {completedCount === 0
                ? "Start Module 1 to kick off your progress tracker."
                : isComplete
                  ? "Every module complete. You can review anything anytime."
                  : `${completedCount} complete, ${remaining} to go.`}
            </p>
          </div>

          <div className="hidden min-w-[210px] border-l border-[#c8dbf2] pl-4 text-[0.72rem] font-semibold italic text-[#3d5677] lg:block">
            "{motivationalLine}"
          </div>
        </div>
      </div>
    </div>
  );
}
