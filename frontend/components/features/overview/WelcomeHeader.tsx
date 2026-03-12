"use client";

import { useMemo } from "react";
import { pickRandom, trackLabel } from "@/lib/utils";

const FALLBACK_HEADERS = [
  "Good to have you here, {name}.",
  "Ready when you are, {name}.",
  "Let's pick up where you left off, {name}.",
  "Welcome back, {name}. You've got this.",
  "Your path is waiting, {name}.",
];

interface WelcomeHeaderProps {
  name: string;
  track: string;
  headers?: string[];
}

export function WelcomeHeader({ name, track, headers }: WelcomeHeaderProps) {
  const firstName = name.split(" ")[0] ?? name;
  const pool = headers && headers.length > 0 ? headers : FALLBACK_HEADERS;
  const raw = useMemo(() => pickRandom(pool), [pool]);
  const headline = raw.replace("{name}", firstName);

  return (
    <div className="premium-panel rounded-[34px] px-8 py-8 md:px-10 md:py-10">
      <div className="relative z-10">
        <span className="section-kicker">Your onboarding launch point</span>
        <h1 className="mt-5 max-w-3xl text-h1 font-display text-brand-ink">{headline}</h1>
        <p className="mt-4 max-w-2xl text-ui text-text-secondary">
          AAP Start keeps everything focused into clear modules, confirmations, and next steps so your first stretch feels guided instead of overwhelming.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <span className="rounded-full border border-brand-action/15 bg-brand-action/[0.08] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-action">
            {trackLabel(track)} track
          </span>
          <span className="rounded-full border border-white/90 bg-white/[0.75] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
            Progress saves automatically
          </span>
          <span className="rounded-full border border-white/90 bg-white/[0.75] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
            Review modules any time
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/80 bg-white/[0.72] p-5 shadow-sm backdrop-blur-xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Built for clarity</p>
            <p className="mt-3 text-ui text-text-secondary">
              Move through one focused module at a time, with quizzes and confirmations only where they help reinforce key expectations.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/80 bg-white/[0.72] p-5 shadow-sm backdrop-blur-xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Designed to support day one</p>
            <p className="mt-3 text-ui text-text-secondary">
              You do not need to memorize everything now. The goal is to help you start strong and know where to go when you need a refresher.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
