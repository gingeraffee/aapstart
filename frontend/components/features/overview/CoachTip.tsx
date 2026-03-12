"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { pickRandom } from "@/lib/utils";

const FALLBACK_TIPS = [
  "Modules do not have to be done in one sitting. Your progress is always saved.",
  "The Resource Hub is always available, even after onboarding is complete.",
  "If something in a module is not clear, HR is your best first stop.",
  "You can revisit completed modules any time. There is no penalty for reviewing.",
  "Take your time on acknowledgements. They reflect real expectations, not filler clicks.",
];

interface CoachTipProps {
  tips?: string[];
}

export function CoachTip({ tips }: CoachTipProps) {
  const pool = tips && tips.length > 0 ? tips : FALLBACK_TIPS;
  const tip = useMemo(() => pickRandom(pool), [pool]);

  return (
    <Card padding="md" className="overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(48,119,185,0.12),transparent)]" />
      <div className="relative z-10 space-y-4">
        <span className="section-kicker">Guide note</span>
        <div>
          <h3 className="text-h3 text-text-primary">A little help while you onboard</h3>
          <p className="mt-3 text-ui leading-7 text-text-secondary">{tip}</p>
        </div>
        <div className="soft-divider" />
        <Link href="/resources" className="inline-flex items-center gap-2 text-ui font-semibold text-brand-action hover:text-brand-deep">
          Open the Resource Hub
          <span aria-hidden>→</span>
        </Link>
      </div>
    </Card>
  );
}