"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { modulesApi, progressApi } from "@/lib/api";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleDetail, ModuleSummary, ProgressRecord } from "@/lib/types";

const CONGRATS_MESSAGES = [
  {
    headline: "You crushed that module.",
    sub: "Confident pace. Clean finish. Keep that energy.",
  },
  {
    headline: "Certified momentum acquired.",
    sub: "One more strong rep in the books.",
  },
  {
    headline: "That was smooth.",
    sub: "You are turning onboarding into a victory lap.",
  },
  {
    headline: "Another one complete.",
    sub: "You are stacking wins, not just checkboxes.",
  },
  {
    headline: "That is how pros do it.",
    sub: "Short steps, steady progress, zero drama.",
  },
  {
    headline: "Clean sweep.",
    sub: "You understood it, confirmed it, and finished strong.",
  },
  {
    headline: "Onboarding score just went up.",
    sub: "You are building real confidence fast.",
  },
];

export default function CompletePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: module, isLoading: loadingModule } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );
  const { data: allModules, isLoading: loadingModules } = useSWR(
    "modules",
    () => modulesApi.list() as Promise<ModuleSummary[]>
  );
  const { data: progress, isLoading: loadingProgress } = useSWR(
    "progress",
    () => progressApi.getAll() as Promise<ProgressRecord[]>
  );

  const [showCongrats, setShowCongrats] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const shownForSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!module) return;
    if (shownForSlugRef.current === module.slug) return;

    shownForSlugRef.current = module.slug;
    setMessageIndex(Math.floor(Math.random() * CONGRATS_MESSAGES.length));
    setShowCongrats(true);
  }, [module]);

  if (loadingModule || loadingModules || loadingProgress || !module) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const liveModules = (allModules ?? [])
    .filter((item) => item.status === "published")
    .sort((a, b) => a.order - b.order);
  const hasAcknowledgement = module.requires_acknowledgement || module.acknowledgements.length > 0;
  const hasQuiz = module.requires_quiz || (module.quiz?.questions?.length ?? 0) > 0;

  const progressMap = new Map<string, ProgressRecord>();
  (progress ?? []).forEach((item) => progressMap.set(item.module_slug, item));

  const currentIndex = liveModules.findIndex((item) => item.slug === slug);
  const nextModule = currentIndex >= 0 ? liveModules[currentIndex + 1] ?? null : null;
  const allDone = liveModules.every((item) => progressMap.get(item.slug)?.module_completed);

  const steps = buildModuleSteps({
    requiresAcknowledgement: hasAcknowledgement,
    requiresQuiz: hasQuiz,
    current: "complete",
    includeComplete: true,
  });

  const footer =
    nextModule && !allDone ? (
      <ModuleFooter
        backHref="/overview"
        backLabel="Back to my path"
        ctaHref={`/modules/${nextModule.slug}`}
        ctaLabel={`Next: ${nextModule.title}`}
        helperText="Your progress is saved automatically."
      />
    ) : (
      <ModuleFooter
        backHref="/overview"
        backLabel="Back to my path"
        ctaHref="/overview"
        ctaLabel={allDone ? "View full journey" : "Return to overview"}
      />
    );

  const message = CONGRATS_MESSAGES[messageIndex] ?? CONGRATS_MESSAGES[0];

  return (
    <>
      <ModuleShell
        breadcrumbs={[
          { label: "My Path", href: "/overview" },
          { label: module.title, href: `/modules/${slug}` },
          { label: "Complete" },
        ]}
        moduleOrder={module.order}
        stageLabel="Complete"
        headline="Module complete. Nice work."
        description={
          allDone
            ? "You finished every published module in your path."
            : "This module is now recorded. Keep your momentum going into the next one."
        }
        contextNote={module.title}
        steps={steps}
        footer={footer}
      >
        <ModulePanel>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12.5 9.5 18 20 6" />
              </svg>
            </div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-emerald-600">Saved and completed</p>
            <h2 className="mt-2 text-[1.35rem] font-extrabold tracking-[-0.02em] text-text-primary">{module.title}</h2>
            <p className="mt-2 max-w-[520px] text-[0.86rem] leading-[1.65] text-text-secondary">
              {allDone
                ? "You closed out the full onboarding path. This is a strong start and a major milestone."
                : "You are moving through onboarding exactly the right way: one module, one clear step at a time."}
            </p>
          </div>
        </ModulePanel>
      </ModuleShell>

      {showCongrats ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#081124]/45 px-4 backdrop-blur-[2px]"
          onClick={() => setShowCongrats(false)}
        >
          <div
            className="w-full max-w-[460px] rounded-[20px] border border-[#bcd6ea] bg-[linear-gradient(150deg,#ffffff_0%,#f2f9ff_65%,#fff6f8_100%)] p-6 shadow-[0_28px_70px_rgba(11,20,40,0.32)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 h-1.5 w-full rounded-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_46%,#df0030_100%)]" />

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[1.45rem]">
              <span aria-hidden>🎉</span>
            </div>

            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-brand-action">Module complete</p>
            <h3 className="mt-1.5 text-[1.45rem] font-extrabold leading-tight tracking-[-0.02em] text-text-primary">{message.headline}</h3>
            <p className="mt-2 text-[0.86rem] leading-[1.65] text-text-secondary">{message.sub}</p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const current = messageIndex;
                  let next = current;
                  while (next === current && CONGRATS_MESSAGES.length > 1) {
                    next = Math.floor(Math.random() * CONGRATS_MESSAGES.length);
                  }
                  setMessageIndex(next);
                }}
                className="rounded-[10px] border border-[#d6deeb] bg-white px-3.5 py-2 text-[0.78rem] font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]"
              >
                Another line
              </button>
              <button
                onClick={() => setShowCongrats(false)}
                className="rounded-[10px] bg-[linear-gradient(135deg,#df0030_0%,#0f7fb3_100%)] px-4 py-2 text-[0.8rem] font-semibold text-white shadow-[0_10px_18px_rgba(15,127,179,0.24)] transition-all hover:-translate-y-px"
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
