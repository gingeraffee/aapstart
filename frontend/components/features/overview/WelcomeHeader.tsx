"use client";

import { useMemo } from "react";
import { pickRandom } from "@/lib/utils";

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

export function WelcomeHeader({ name, headers }: WelcomeHeaderProps) {
  const firstName = name.split(" ")[0] ?? name;
  const pool = headers && headers.length > 0 ? headers : FALLBACK_HEADERS;
  const raw = useMemo(() => pickRandom(pool), [pool]);
  const headline = raw.replace("{name}", firstName);

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-surface">
      {/* Gradient stripe */}
      <div className="h-1 bg-gradient-to-r from-brand-deep via-brand-action to-accent" />

      <div className="p-8">
        <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-accent">
          Your Onboarding Journey
        </p>
        <h1 className="mt-3 text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-text-primary">
          {headline}
        </h1>
        <p className="mt-3 max-w-[480px] text-[0.93rem] leading-[1.7] text-text-secondary">
          Clear modules, focused confirmations, and next steps that keep your first stretch guided instead of overwhelming.
        </p>
      </div>
    </div>
  );
}
