"use client";

import Link from "next/link";
import { useMemo } from "react";
import { pickRandom } from "@/lib/utils";
import type { ModuleSummary } from "@/lib/types";

const FALLBACK_HEADERS = [
  "Good to see you, {name}.",
  "Ready when you are, {name}.",
  "Let's pick up where you left off, {name}.",
  "Welcome back, {name}. You've got this.",
  "Your path is waiting, {name}.",
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
  comingSoonCount = 0,
}: WelcomeHeaderProps) {
  const firstName = name.split(" ")[0] ?? name;
  const pool = headers && headers.length > 0 ? headers : FALLBACK_HEADERS;
  const raw = useMemo(() => pickRandom(pool), [pool]);
  const headline = raw.replace("{name}", firstName);
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remaining = totalCount - completedCount;

  const pills = [
    `${totalCount} live module${totalCount !== 1 ? "s" : ""}`,
    "Manual completion only",
    ...(comingSoonCount > 0 ? [`${comingSoonCount} coming soon`] : []),
    `${pct}% complete`,
  ];

  return (
    <div
      className="relative overflow-hidden rounded-[20px]"
      style={{
        background: "linear-gradient(140deg, #1a3060 0%, #122244 55%, #0d1830 100%)",
        boxShadow: "0 4px 28px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.12)",
      }}
    >
      {/* Top accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-brand-action via-brand-sky to-brand-action" />

      <div className="px-7 pt-6 pb-6">
        {/* Eyebrow */}
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-slate-400">
          AAP Start
        </p>

        {/* Headline */}
        <h1 className="mt-2 text-[clamp(1.75rem,2.8vw,2.35rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
          {headline}
        </h1>

        {/* Description */}
        <p className="mt-2.5 max-w-[580px] text-[0.88rem] leading-[1.65] text-slate-200">
          AAP Start turns the early onboarding stretch into a guided system so you can build confidence, keep momentum, and know what comes next.
        </p>

        {/* Next up */}
        {currentModule && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <p className="text-[0.76rem] text-slate-200 font-medium">
              Next up{" "}
              <Link
                href={`/modules/${currentModule.slug}`}
                className="text-brand-sky font-semibold hover:underline"
              >
                {currentModule.title}
              </Link>
            </p>
            <p className="mt-0.5 text-[0.74rem] text-slate-300">
              {remaining} module{remaining !== 1 ? "s" : ""} left in the tracked path.
            </p>
          </div>
        )}

        {/* Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {pills.map((pill) => (
            <span
              key={pill}
              className="rounded-full px-3 py-1 text-[0.7rem] font-medium text-slate-200"
              style={{ border: "1px solid rgba(255,255,255,0.25)" }}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
