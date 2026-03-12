"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { plural } from "@/lib/utils";
import type { ModuleDetail } from "@/lib/types";
import { BrandLockup } from "@/components/branding/BrandLockup";

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: module, isLoading, error } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );

  useEffect(() => {
    if (module && module.status === "published") {
      progressApi.visit(slug).catch(() => {});
    }
  }, [module, slug]);

  if (isLoading) {
    return (
      <PageContainer size="wide">
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      </PageContainer>
    );
  }

  if (error || !module) {
    return (
      <PageContainer size="wide">
        <Card padding="lg">
          <p className="text-ui text-text-secondary">Module not found.</p>
        </Card>
      </PageContainer>
    );
  }

  const currentModule = module;
  const nextStep = currentModule.requires_acknowledgement
    ? {
        title: "Confirm understanding",
        body: "You will review and confirm the acknowledgement statements that matter for this module before moving on.",
      }
    : currentModule.requires_quiz
      ? {
          title: "Pass the quiz",
          body: "You will answer one question at a time and move forward only after each answer is correct.",
        }
      : {
          title: "Mark complete",
          body: "This module can be completed as soon as you finish reviewing the content below.",
        };

  function handleContinue() {
    if (currentModule.requires_acknowledgement) {
      router.push(`/modules/${slug}/acknowledge`);
      return;
    }

    if (currentModule.requires_quiz) {
      router.push(`/modules/${slug}/quiz`);
      return;
    }

    router.push(`/modules/${slug}/complete`);
  }

  return (
    <PageContainer size="wide">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6 animate-fade-up">
          <section className="premium-panel-dark rounded-[36px] px-7 py-7 text-white md:px-10 md:py-10">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-[-8rem] top-[-8rem] h-[20rem] w-[20rem] rounded-full bg-white/10 blur-3xl" />
              <div className="absolute right-[-5rem] top-[20%] h-[18rem] w-[18rem] rounded-full bg-brand-action/25 blur-3xl" />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="flex flex-wrap items-center gap-2 text-caption text-white/60">
                <Link href="/overview" className="hover:text-white">My Path</Link>
                <span>/</span>
                <span className="text-white">{currentModule.title}</span>
              </div>

              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/10 bg-white/10 text-white" variant="muted">
                      Module {String(currentModule.order).padStart(2, "0")}
                    </Badge>
                    <Badge className="border-brand-action/20 bg-brand-action/20 text-white" variant="info">
                      ~{currentModule.estimated_minutes} {plural(currentModule.estimated_minutes, "min", "mins")}
                    </Badge>
                    {currentModule.requires_acknowledgement && (
                      <Badge className="border-white/10 bg-white/10 text-white" variant="muted">Acknowledgement</Badge>
                    )}
                    {currentModule.requires_quiz && (
                      <Badge className="border-white/10 bg-white/10 text-white" variant="muted">Quiz</Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-5">
                    <BrandLockup className="w-fit shrink-0 border-white/12 bg-black/88 p-2.5" imageClassName="w-[11.5rem] md:w-[12.75rem]" />
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-brand-sky/90">Guided module</p>
                      <h1 className="mt-4 max-w-4xl text-h1 font-display text-white">{currentModule.title}</h1>
                      {currentModule.description && (
                        <p className="mt-4 max-w-3xl text-ui leading-8 text-white/72">{currentModule.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/55">This module is for</p>
                      <p className="mt-2 text-ui text-white/78">
                        Practical expectations, time, pay, benefits, and the rhythm of day-to-day work at AAP.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/55">Best way to use it</p>
                      <p className="mt-2 text-ui text-white/78">
                        Read through each section, use the chapter tabs to pace yourself, then move into confirmation and quiz.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-white/10 bg-white/8 p-3 backdrop-blur-xl">
                    <StepIndicator
                      current="module"
                      requiresAcknowledgement={currentModule.requires_acknowledgement}
                      requiresQuiz={currentModule.requires_quiz}
                    />
                  </div>
                </div>

                <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-6 shadow-[0_20px_50px_rgba(2,8,18,0.22)] backdrop-blur-xl">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-sky/85">What happens next</p>
                  <p className="mt-4 text-[1.15rem] font-semibold tracking-[-0.02em] text-white">{nextStep.title}</p>
                  <p className="mt-3 text-ui leading-7 text-white/72">{nextStep.body}</p>
                  <div className="mt-6 rounded-[22px] border border-white/10 bg-black/10 px-4 py-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/50">Completion stays guided</p>
                    <p className="mt-2 text-caption leading-6 text-white/68">
                      You only move into the next required step, so the experience stays clear and not overly technical.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="premium-panel rounded-[34px] px-7 py-7 md:px-10 md:py-10">
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Module content</p>
                  <h2 className="mt-2 text-h2 text-brand-ink">Read through the essentials, section by section.</h2>
                </div>
                <p className="max-w-xl text-ui leading-7 text-text-secondary">
                  This page is designed to feel guided, not overwhelming. Use the chapter tabs where available to move through one cluster of information at a time.
                </p>
              </div>

              <div className="soft-divider" />

              {currentModule.content_blocks.map((block, index) => (
                <div key={index} className="animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                  <ContentBlock block={block} />
                </div>
              ))}

              <div className="soft-divider" />

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Link href="/overview" className="text-ui font-semibold text-text-muted hover:text-text-primary">
                  ← Back to my path
                </Link>
                <Button size="lg" onClick={handleContinue}>
                  {currentModule.requires_acknowledgement
                    ? "Continue to confirmation"
                    : currentModule.requires_quiz
                      ? "Continue to quiz"
                      : "Mark complete"}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <div className="premium-panel-dark rounded-[32px] px-6 py-6 text-white">
            <div className="relative z-10 space-y-4">
              <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-brand-sky/90">
                How to move through this module
              </span>
              <div className="space-y-4 text-ui leading-7 text-white/78">
                <p>Read at your own pace. The content stays organized into focused sections rather than one long handbook page.</p>
                <p>Track-specific blocks are already filtered for your role, so you only see what is relevant to you.</p>
              </div>
            </div>
          </div>

          <Card padding="md" className="border-brand-deep/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,247,252,0.94))]">
            <div className="space-y-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Completion rules</p>
              <ul className="space-y-3 text-ui leading-7 text-text-secondary">
                <li>Opening the module saves your visit automatically.</li>
                <li>{currentModule.requires_acknowledgement ? "You will confirm the acknowledgement statements before completion." : "This module does not require acknowledgement."}</li>
                <li>{currentModule.requires_quiz ? "The quiz must be completed correctly to pass the module." : "There is no quiz for this module."}</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}