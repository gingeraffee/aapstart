"use client";

import useSWR from "swr";
import { useParams } from "next/navigation";
import { modulesApi, progressApi } from "@/lib/api";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleDetail, ModuleSummary, ProgressRecord } from "@/lib/types";

const CONGRATS_MESSAGES = [
  {
    headline: "Nice finish.",
    sub: "You are building real momentum, one clear step at a time.",
  },
  {
    headline: "Another one complete.",
    sub: "Your rhythm is showing. Keep going while it feels fresh.",
  },
  {
    headline: "Strong close.",
    sub: "You are moving through onboarding with focus and confidence.",
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

  const message = CONGRATS_MESSAGES[module.order % CONGRATS_MESSAGES.length];

  return (
    <ModuleShell
      breadcrumbs={[
        { label: "My Path", href: "/overview" },
        { label: module.title, href: `/modules/${slug}` },
        { label: "Complete" },
      ]}
      moduleOrder={module.order}
      stageLabel="Complete"
      headline="Nice work. This module is now in the books."
      description={
        allDone
          ? "You wrapped every published module in your journey."
          : "Progress is saved. Keep going when you are ready for the next step."
      }
      contextNote={module.title}
      steps={steps}
      footer={footer}
    >
      <ModulePanel>
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#9ed1ee] bg-[#eaf6ff] text-[#0f6da3]">
            <span className="absolute inset-[-4px] rounded-full border border-[#c9e6fa] opacity-80" />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12.5 9.5 18 20 6" />
            </svg>
          </div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[#0f6da3]">Saved and complete</p>
          <h2 className="mt-2 text-[1.3rem] font-extrabold tracking-[-0.02em] text-text-primary">{module.title}</h2>
          <p className="mt-2 max-w-[520px] text-[0.9rem] leading-[1.68] text-text-secondary">
            {allDone
              ? "You have completed your full onboarding path. Strong finish."
              : "You are moving through onboarding with clear, consistent progress."}
          </p>
          {!allDone && nextModule ? (
            <p className="mt-3 text-[0.78rem] font-semibold text-[#1c4d78]">Up next: {nextModule.title}</p>
          ) : null}
        </div>
      </ModulePanel>

      <ModulePanel className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]">
        <p className="text-[0.92rem] font-semibold text-text-primary">{message.headline}</p>
        <p className="mt-1 text-[0.84rem] leading-[1.6] text-text-secondary">{message.sub}</p>
      </ModulePanel>
    </ModuleShell>
  );
}
