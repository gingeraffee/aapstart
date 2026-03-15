"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import type { ContentBlock as ModuleContentBlock, ModuleDetail } from "@/lib/types";

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toAnchor(value: string, index: number): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized ? `section-${normalized}-${index}` : `section-${index}`;
}

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: module, isLoading, error } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);

  useEffect(() => {
    if (module && module.status === "published") {
      progressApi.visit(slug).catch(() => {});
    }
  }, [module, slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="mx-auto w-full max-w-[860px] px-6 py-10">
        <p className="text-[0.88rem] text-text-secondary">Module not found.</p>
      </div>
    );
  }

  const currentModule = module;
  const hasAcknowledgement =
    currentModule.requires_acknowledgement || currentModule.acknowledgements.length > 0;
  const hasQuiz =
    currentModule.requires_quiz || (currentModule.quiz?.questions?.length ?? 0) > 0;

  type Section = { id: string; title?: string; blocks: ModuleContentBlock[] };
  const output: Section[] = [];

  let sectionIndex = 0;
  let current: Section = { id: "section-overview", blocks: [] };

  currentModule.content_blocks.forEach((block) => {
    if (block.type === "heading") {
      const headingText = stripHtml(block.content ?? "");
      if (current.title || current.blocks.length > 0) {
        output.push(current);
      }
      current = {
        id: toAnchor(headingText, sectionIndex),
        title: headingText,
        blocks: [],
      };
      sectionIndex += 1;
      return;
    }

    current.blocks.push(block);
  });

  if (current.title || current.blocks.length > 0) {
    output.push(current);
  }

  const sections = output.filter((section) => section.title || section.blocks.length > 0);

  const steps = buildModuleSteps({
    requiresAcknowledgement: hasAcknowledgement,
    requiresQuiz: hasQuiz,
    current: "read",
  });

  const continueLabel = hasAcknowledgement
    ? "Continue to confirmation"
    : hasQuiz
      ? "Continue to quiz"
      : "Mark complete";

  const nextStepLabel = hasAcknowledgement
    ? "Next: confirmation"
    : hasQuiz
      ? "Next: quiz"
      : "Finish this module";

  const railSections = sections.filter((section) => section.title);

  const rail = (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-[#d6deeb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_12px_22px_rgba(12,24,47,0.08)]">
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-text-muted">On this page</p>
        <div className="mt-2 space-y-1.5">
          {railSections.length > 0 ? (
            railSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-[8px] px-2 py-1 text-[0.76rem] font-semibold text-[#475569] transition-colors hover:bg-cyan-50 hover:text-brand-action"
              >
                {section.title}
              </a>
            ))
          ) : (
            <p className="text-[0.75rem] text-text-muted">Scroll to read this module in full.</p>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#d6deeb] bg-white p-4 shadow-[0_10px_20px_rgba(12,24,47,0.06)]">
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-text-muted">Reading rhythm</p>
        <p className="mt-1.5 text-[0.74rem] leading-[1.55] text-text-secondary">
          Keep a steady pace. This module is designed as short, scannable sections so you can build confidence quickly.
        </p>
      </div>
    </div>
  );

  return (
    <ModuleShell
      breadcrumbs={[
        { label: "My Path", href: "/overview" },
        { label: currentModule.title },
      ]}
      moduleOrder={currentModule.order}
      stageLabel="Read"
      headline={currentModule.title}
      description={
        currentModule.description ||
        "Work through the core ideas below, then continue to the next step once everything is clear."
      }
      estimatedMinutes={currentModule.estimated_minutes}
      steps={steps}
      rail={rail}
      footer={
        <ModuleFooter
          backHref="/overview"
          backLabel="Back to my path"
          ctaLabel={continueLabel}
          helperText={nextStepLabel}
          onCtaClick={() => {
            if (hasAcknowledgement) {
              router.push(`/modules/${slug}/acknowledge`);
              return;
            }
            if (hasQuiz) {
              router.push(`/modules/${slug}/quiz`);
              return;
            }
            router.push(`/modules/${slug}/complete`);
          }}
        />
      }
    >
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <ModulePanel key={section.id || `section-${sectionIndex}`} id={section.id} className="scroll-mt-24">
            {section.title ? (
              <h2 className="mb-4 text-[1.25rem] font-extrabold tracking-[-0.02em] text-text-primary">{section.title}</h2>
            ) : null}
            <div className="space-y-5">
              {section.blocks.map((block, blockIndex) => (
                <div key={`${section.id}-${blockIndex}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(blockIndex, 8) * 25}ms` }}>
                  <ContentBlock block={block} />
                </div>
              ))}
            </div>
          </ModulePanel>
        ))}
      </div>
    </ModuleShell>
  );
}
