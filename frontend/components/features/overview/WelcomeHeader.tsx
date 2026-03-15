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
  const remaining = totalCount - completedCount;

  const ctaHref = currentModule ? `/modules/${currentModule.slug}` : "/roadmap";
  const ctaLabel = currentModule ? "Continue journey" : "View roadmap";

  return (
    <div
      className="relative overflow-hidden rounded-[22px]"
      style={{
        background: "linear-gradient(145deg, #ffffff 0%, #f4f9ff 62%, #fff6f5 100%)",
        border: "1px solid rgba(32, 82, 140, 0.2)",
        boxShadow: "0 20px 44px rgba(19, 37, 66, 0.14), 0 6px 14px rgba(19, 37, 66, 0.08)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[5px]"
        style={{ background: "linear-gradient(90deg, #0e76bd 0%, #06b6d4 45%, #df002a 100%)" }}
      />

      <div className="px-7 pb-6 pt-7 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ color: "#0e76bd" }}>
            AAP Start
          </p>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{
              backgroundColor: "rgba(223, 0, 42, 0.09)",
              border: "1px solid rgba(223, 0, 42, 0.2)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #df002a 0%, #06b6d4 100%)" }}
            />
            <span className="text-[0.66rem] font-semibold text-[#9f1239]">{completedCount} completed</span>
          </div>
        </div>

        <h1 className="mt-2 text-[clamp(1.95rem,3vw,2.65rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#0f172a]">
          {headline}
        </h1>

        <p className="mt-2.5 max-w-[620px] text-[0.92rem] leading-[1.65] text-[#334155]">
          You are not checking boxes here. You are building confidence, one clear step at a time.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[0.78rem] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #df002a 0%, #c10027 100%)",
              boxShadow: "0 10px 24px rgba(223, 0, 42, 0.28)",
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
          <p className="text-[0.72rem] font-medium text-[#475569]">
            {currentModule ? `Up next: ${currentModule.title}` : "You have completed every module in this path."}
          </p>
        </div>

        <div
          className="mt-5 rounded-[14px] px-5 py-4"
          style={{
            background: "linear-gradient(180deg, rgba(14,118,189,0.08) 0%, rgba(6,182,212,0.06) 100%)",
            border: "1px solid rgba(14,118,189,0.14)",
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[120px]">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#64748b]">Modules done</p>
              <p className="mt-1 text-[1.1rem] font-extrabold leading-tight text-[#0f172a]">
                {completedCount}
                <span className="ml-1 text-[0.75rem] font-semibold text-[#64748b]">of {totalCount}</span>
              </p>
            </div>

            <div className="h-10 w-px bg-[#bfdbfe]" />

            <div className="min-w-[210px] flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#64748b]">Progress</p>
                <p className="text-[0.78rem] font-extrabold text-[#0e76bd]">{pct}%</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(14,118,189,0.16)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(pct, 6)}%`,
                    background: "linear-gradient(90deg, #06b6d4 0%, #0e76bd 55%, #df002a 100%)",
                    opacity: pct === 0 ? 0.38 : 1,
                  }}
                />
              </div>
              <p className="mt-1 text-[0.67rem] text-[#64748b]">
                {completedCount === 0
                  ? "Start Module 1 to kick off your progress tracker."
                  : `${completedCount} complete, ${remaining} to go.`}
              </p>
            </div>

            <div className="hidden min-w-[170px] text-[0.73rem] font-semibold italic text-[#334155] lg:block">
              "{motivationalLine}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
