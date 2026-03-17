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
        background: "var(--welcome-bg)",
        border: "1px solid var(--welcome-border)",
        boxShadow: "var(--welcome-shadow)",
      }}
    >
      <div className="pointer-events-none absolute -right-9 -top-9 h-28 w-28 rounded-full" style={{ border: "1px solid var(--welcome-circle-border)" }} />
      <div className="pointer-events-none absolute -right-3 top-4 h-14 w-14 rounded-full" style={{ border: "1px solid var(--welcome-circle-border-2)" }} />
      <div className="pointer-events-none absolute right-12 top-14 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(223,0,48,0.08)_0%,rgba(223,0,48,0)_72%)]" />
      <div
        className="absolute inset-x-0 top-0 h-[4px]"
        style={{ background: "linear-gradient(90deg, #0ea5d9 0%, #22d3ee 58%, #d63964 100%)" }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em]"
          style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}
        >
          <span className="h-2 w-2 rounded-full bg-[#df0030]" />
          AAP Start
        </p>
        <div
          className="rounded-full px-3 py-1 text-[0.67rem] font-semibold"
          style={{ border: "1px solid var(--welcome-day-border)", background: "var(--welcome-day-bg)", color: "var(--welcome-day-text)" }}
        >
          {isComplete ? "All modules complete" : `Day ${activeDay} of ${totalCount || 1}`}
        </div>
      </div>

      <h1 className="mt-2 text-[clamp(2rem,3vw,2.8rem)] font-extrabold leading-[1.03] tracking-[-0.03em]" style={{ color: "var(--welcome-headline)" }}>
        {headline}
      </h1>

      <p className="mt-2.5 max-w-[620px] text-[0.93rem] leading-[1.68]" style={{ color: "var(--welcome-body)" }}>
        One clear step at a time. Your launch path is built to keep momentum steady, practical, and easy to follow.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.79rem] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
            style={{
              background: "var(--welcome-cta-bg)",
              border: "1px solid var(--welcome-cta-border)",
              boxShadow: "var(--welcome-cta-shadow)",
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
          <p className="text-[0.73rem] font-medium" style={{ color: "var(--welcome-subtext)" }}>
            {currentModule ? `Up next: ${currentModule.title}` : "Every module in this journey is complete."}
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-[11px] px-3 py-2 text-[0.71rem] font-semibold"
          style={{ background: "var(--badge-bg)", border: "1px solid var(--welcome-border)", color: "var(--badge-text)" }}
        >
          <span className="h-2 w-2 rounded-full bg-[#0ea5d9]" />
          {isComplete ? "Journey wrapped" : `${remaining} module${remaining === 1 ? "" : "s"} left`}
        </div>
      </div>

      <div
        className="mt-5 rounded-[15px] px-5 py-3.5"
        style={{
          background: "var(--welcome-stat-bg)",
          border: "1px solid var(--welcome-stat-border)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="min-w-[112px]">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--welcome-stat-label)" }}>Completed</p>
            <p className="mt-1 text-[1.05rem] font-extrabold leading-tight" style={{ color: "var(--welcome-stat-value)" }}>
              {completedCount}
              <span className="ml-1 text-[0.75rem] font-semibold" style={{ color: "var(--welcome-stat-secondary)" }}>of {totalCount}</span>
            </p>
          </div>

          <div className="min-w-[230px] flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--welcome-progress-label)" }}>Progress</p>
              <p className="text-[0.78rem] font-extrabold" style={{ color: "var(--welcome-progress-value)" }}>{pct}%</p>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full" style={{ background: "var(--welcome-progress-track)" }}>
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
            <p className="mt-1.5 text-[0.68rem]" style={{ color: "var(--welcome-progress-note)" }}>
              {completedCount === 0
                ? "Start Module 1 to kick off your progress tracker."
                : isComplete
                  ? "Every module complete. You can review anything anytime."
                  : `${completedCount} complete, ${remaining} to go.`}
            </p>
          </div>

          <div className="hidden min-w-[210px] pl-4 text-[0.72rem] font-semibold italic lg:block" style={{ borderLeft: "1px solid var(--welcome-quote-border)", color: "var(--welcome-quote-text)" }}>
            &ldquo;{motivationalLine}&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}
