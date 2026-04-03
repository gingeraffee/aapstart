"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { modulesApi, progressApi } from "@/lib/api";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleDetail, ModuleSummary, ProgressRecord } from "@/lib/types";


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
    .filter((item) => !item.tracks?.includes("management"))
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

  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Randomised palettes so every completion feels different
    const palettes = [
      ["#0f7fb3", "#22d3ee", "#38bdf8", "#fbbf24", "#34d399", "#a78bfa"],
      ["#f472b6", "#fbbf24", "#34d399", "#818cf8", "#22d3ee", "#fb923c"],
      ["#0f7fb3", "#6366f1", "#a78bfa", "#f472b6", "#fbbf24", "#34d399"],
      ["#22d3ee", "#2dd4bf", "#34d399", "#fbbf24", "#fb923c", "#f87171"],
      ["#818cf8", "#c084fc", "#f472b6", "#fbbf24", "#22d3ee", "#0f7fb3"],
    ];
    const colors = palettes[Math.floor(Math.random() * palettes.length)];

    // Randomised celebration patterns
    const patterns = [
      // Pattern 1: Big center burst + side streams
      () => {
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.4 }, colors });
        streamFromSides(2500);
      },
      // Pattern 2: Firework — three staggered bursts from different positions
      () => {
        confetti({ particleCount: 50, spread: 70, origin: { x: 0.3, y: 0.5 }, colors });
        setTimeout(() => confetti({ particleCount: 60, spread: 80, origin: { x: 0.7, y: 0.35 }, colors }), 300);
        setTimeout(() => confetti({ particleCount: 70, spread: 90, origin: { x: 0.5, y: 0.3 }, colors }), 600);
        setTimeout(() => streamFromSides(1800), 800);
      },
      // Pattern 3: Cannon — rapid-fire small bursts that sweep across
      () => {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            confetti({
              particleCount: 25,
              angle: 90 + (Math.random() * 40 - 20),
              spread: 45 + Math.random() * 30,
              origin: { x: 0.15 + i * 0.175, y: 0.6 },
              colors,
            });
          }, i * 180);
        }
        setTimeout(() => streamFromSides(1600), 900);
      },
      // Pattern 4: Rain — wide, gentle shower from the top
      () => {
        confetti({
          particleCount: 120,
          spread: 160,
          origin: { x: 0.5, y: -0.1 },
          gravity: 0.6,
          ticks: 300,
          colors,
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 140,
            origin: { x: 0.5, y: -0.05 },
            gravity: 0.5,
            ticks: 250,
            colors,
          });
        }, 700);
      },
      // Pattern 5: Popcorn — small pops from random spots
      () => {
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            confetti({
              particleCount: 15 + Math.floor(Math.random() * 15),
              spread: 40 + Math.random() * 30,
              origin: { x: 0.2 + Math.random() * 0.6, y: 0.3 + Math.random() * 0.3 },
              colors,
            });
          }, i * 250);
        }
      },
    ];

    function streamFromSides(duration: number) {
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 2 + Math.floor(Math.random() * 3),
          angle: 55 + Math.random() * 15,
          spread: 45 + Math.random() * 20,
          origin: { x: 0, y: 0.5 + Math.random() * 0.2 },
          colors,
        });
        confetti({
          particleCount: 2 + Math.floor(Math.random() * 3),
          angle: 110 + Math.random() * 15,
          spread: 45 + Math.random() * 20,
          origin: { x: 1, y: 0.5 + Math.random() * 0.2 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    // Pick a random pattern
    patterns[Math.floor(Math.random() * patterns.length)]();
  }, []);

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

    </ModuleShell>
  );
}
