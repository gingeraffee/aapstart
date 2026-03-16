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
    ? "Move to confirmation"
    : hasQuiz
      ? "Move to quick check"
      : "Save and complete";

  const nextStepLabel = hasAcknowledgement
    ? "Next up: confirmation"
    : hasQuiz
      ? "Next up: quick check"
      : "Next up: completion";

  const railSections = sections.filter((section) => section.title);

  const rail = (
    <div
      className="rounded-[15px] border border-[#d2dfef] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_12px_22px_rgba(12,24,47,0.08)]"
    >
      <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-text-muted">In this module</p>
      <div className="mt-2.5 space-y-1.5">
        {railSections.length > 0 ? (
          railSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="group flex items-start gap-2 rounded-[9px] px-2 py-1.5 text-[0.75rem] text-[#475569] transition-all duration-200 hover:bg-cyan-50/70 hover:text-brand-action"
            >
              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#a5b9d6] transition-colors group-hover:bg-[#0f7fb3]" />
              <span className="font-semibold leading-[1.3]">{section.title}</span>
            </a>
          ))
        ) : (
          <p className="text-[0.75rem] text-text-muted">Read through this module to move forward.</p>
        )}
      </div>

      <div className="my-3 h-px bg-[#d8e5f5]" />

      <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-text-muted">Reading rhythm</p>
      <p className="mt-1.5 text-[0.74rem] leading-[1.6] text-text-secondary">
        Take it section by section. Each section is short on purpose so the key ideas stick.
      </p>
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
        "Work through the key ideas below, then move to the next step when it feels clear."
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
