"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ContentBlock as ModuleContentBlock, ModuleDetail, ModuleSummary, ProgressRecord } from "@/lib/types";

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toAnchor(value: string, index: number): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized ? `section-${normalized}-${index}` : `section-${index}`;
}

function splitTextBlockByHeadings(block: ModuleContentBlock): ModuleContentBlock[] {
  if (block.type !== "text" || !block.content) return [block];

  const headingPattern = /(<h[23][^>]*>[\s\S]*?<\/h[23]>)/gi;
  const parts = block.content
    .split(headingPattern)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return [block];

  return parts.map((part) => {
    if (/^<h[23][^>]*>/i.test(part)) {
      return {
        type: "heading",
        content: stripHtml(part),
      };
    }

    return {
      ...block,
      type: "text",
      content: part,
    };
  });
}

function sectionBeat(sectionTitle: string | undefined, sectionIndex: number) {
  const title = (sectionTitle ?? "").toLowerCase();

  if (!sectionTitle || sectionIndex === 0 || title.includes("welcome") || title.includes("intro")) {
    return {
      label: "Intro",
      subtitle: "Start with the context so the rest clicks faster.",
      tone: "cyan" as const,
    };
  }

  if (title.includes("who") || title.includes("about") || title.includes("aap")) {
    return {
      label: "Who AAP Is",
      subtitle: "The organization behind the work and why it exists.",
      tone: "navy" as const,
    };
  }

  if (title.includes("mission") || title.includes("vision") || title.includes("values")) {
    return {
      label: "Mission And Values",
      subtitle: "The standards that shape how we make decisions.",
      tone: "red" as const,
    };
  }

  if (title.includes("role") || title.includes("impact") || title.includes("means for")) {
    return {
      label: "For Your Role",
      subtitle: "Translate the big picture into your day-to-day work.",
      tone: "cyan" as const,
    };
  }

  return {
    label: `Story Beat ${String(sectionIndex + 1).padStart(2, "0")}`,
    subtitle: "Take this section in one focused pass before moving on.",
    tone: sectionIndex % 3 === 0 ? ("cyan" as const) : sectionIndex % 3 === 1 ? ("navy" as const) : ("red" as const),
  };
}

function toneStyles(tone: "cyan" | "navy" | "red") {
  if (tone === "navy") {
    return {
      shell: "border-[rgba(69,93,133,0.28)] bg-[linear-gradient(180deg,rgba(27,44,86,0.06)_0%,rgba(27,44,86,0.01)_100%)]",
      chip: "bg-[#1b2c56] text-white",
      icon: "text-[#1b2c56] bg-[rgba(27,44,86,0.12)]",
    };
  }

  if (tone === "red") {
    return {
      shell: "border-[rgba(196,35,74,0.24)] bg-[linear-gradient(180deg,rgba(223,0,48,0.06)_0%,rgba(223,0,48,0.01)_100%)]",
      chip: "bg-[#c4234a] text-white",
      icon: "text-[#c4234a] bg-[rgba(223,0,48,0.1)]",
    };
  }

  return {
    shell: "border-[rgba(14,127,179,0.25)] bg-[linear-gradient(180deg,rgba(14,127,179,0.08)_0%,rgba(14,127,179,0.01)_100%)]",
    chip: "bg-[#0f7fb3] text-white",
    icon: "text-[#0f7fb3] bg-[rgba(14,127,179,0.12)]",
  };
}

function sectionKeyLine(blocks: ModuleContentBlock[]): string | null {
  const firstText = blocks.find((block) => block.type === "text" && block.content)?.content;
  if (!firstText) return null;

  const plain = stripHtml(firstText);
  if (!plain) return null;

  const [firstSentence] = plain.split(/(?<=[.!?])\s+/);
  const line = (firstSentence ?? plain).trim();
  if (line.length < 48) return null;
  return line.length > 170 ? `${line.slice(0, 167)}...` : line;
}

function coachTipForModule(moduleTitle: string, hasQuiz: boolean, hasAcknowledgement: boolean) {
  const title = moduleTitle.toLowerCase();

  if (title.includes("welcome") || title.includes("aap")) {
    return "Look for the big-picture story, not trivia. If you can explain how AAP works in plain language, you are on track.";
  }

  if (title.includes("safety")) {
    return "Read this one like you might need it on a busy day. The goal is quick recall, not perfect wording.";
  }

  if (title.includes("tools") || title.includes("systems")) {
    return "Anchor on where things live and when to use them. That will save more time than memorizing every detail.";
  }

  if (hasQuiz) {
    return "Read once for signal, then once for confidence. If a point feels repeatable, it will probably show up in the quick check.";
  }

  if (hasAcknowledgement) {
    return "Focus on the parts you would feel comfortable standing behind. That usually points to what matters most in the confirmation step.";
  }

  return "Take this section by section and keep your eye on what you would actually use in the role. Clarity beats speed here.";
}

function buildOutcomeLines(
  sections: Array<{ title?: string }>,
  hasQuiz: boolean,
  hasAcknowledgement: boolean
) {
  const titledSections = sections
    .map((section) => section.title?.trim())
    .filter((title): title is string => Boolean(title))
    .slice(0, 2);

  const lines = titledSections.map((title) => `Talk through ${title.toLowerCase()} without reopening the page.`);

  if (hasQuiz) {
    lines.push("Move into the quick check with the main points already in your head.");
  } else if (hasAcknowledgement) {
    lines.push("Move into confirmation knowing what you are agreeing to and why it matters.");
  } else {
    lines.push("Leave with one next action that feels obvious, not fuzzy.");
  }

  return lines.slice(0, 3);
}

function buildHumanMoments(moduleTitle: string, hasQuiz: boolean, hasAcknowledgement: boolean) {
  const title = moduleTitle.toLowerCase();

  if (title.includes("welcome") || title.includes("aap")) {
    return [
      {
        eyebrow: "Reality Check",
        title: "What AAP is and is not",
        body: "AAP is a member-first support system for independent pharmacies. It is not a faceless corporate machine, and your work helps keep that difference real.",
        tone: "navy" as const,
      },
      {
        eyebrow: "People Here Value",
        title: "Clarity, ownership, and follow-through",
        body: "People tend to notice the teammates who ask good questions, stay helpful under pressure, and make the next step easier for someone else.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "New Hire FAQ",
        title: "What am I supposed to remember right now?",
        body: "Not everything. The win this week is understanding the shape of the business, where to ask for help, and what your role connects to.",
        tone: "red" as const,
      },
    ];
  }

  return [
    {
      eyebrow: "Role Connection",
      title: "What your role connects to",
      body: "This module is less about perfect memory and more about knowing how your decisions connect to teammates, tools, and the employee experience around you.",
      tone: "navy" as const,
    },
    {
      eyebrow: "People Here Value",
      title: "Useful beats impressive",
      body: "At this stage, good questions, steady follow-through, and practical judgment usually matter more than trying to sound like you already know everything.",
      tone: "cyan" as const,
    },
    {
      eyebrow: "Good To Know",
      title: hasQuiz ? "You do not need to cram for the quick check" : hasAcknowledgement ? "The confirmation step is about confidence" : "You are aiming for usable clarity",
      body: hasQuiz
        ? "If you can explain the main ideas back to someone, you are probably more ready than you think."
        : hasAcknowledgement
          ? "You are not being asked to memorize legal language. You are being asked to understand what matters and why."
          : "By the end of this page, one or two practical takeaways should feel obvious enough to use this week.",
      tone: "red" as const,
    },
  ];
}

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [reflectionChecks, setReflectionChecks] = useState([false, false, false]);

  const { data: module, isLoading, error } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);
  const { data: moduleCatalog } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

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

  const normalizedBlocks = currentModule.content_blocks.flatMap((block) => splitTextBlockByHeadings(block));

  type Section = { id: string; title?: string; blocks: ModuleContentBlock[] };
  const output: Section[] = [];

  let sectionIndex = 0;
  let current: Section = { id: "section-overview", blocks: [] };

  normalizedBlocks.forEach((block) => {
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
  const firstKeyLine = sectionKeyLine(sections[0]?.blocks ?? []);
  const liveModules = (moduleCatalog ?? [])
    .filter((item) => item.status === "published")
    .sort((a, b) => a.order - b.order);
  const modulePosition = liveModules.findIndex((item) => item.slug === currentModule.slug) + 1 || currentModule.order;
  const totalModules = liveModules.length || currentModule.order;
  const completedModules = (progress ?? []).filter((item) => item.module_completed).length;
  const coachTip = coachTipForModule(currentModule.title, hasQuiz, hasAcknowledgement);
  const outcomeLines = buildOutcomeLines(sections, hasQuiz, hasAcknowledgement);
  const humanMoments = buildHumanMoments(currentModule.title, hasQuiz, hasAcknowledgement);
  const whyThisMatters =
    firstKeyLine ??
    currentModule.description ??
    "This module gives you the context behind the work so the next steps feel practical instead of abstract.";

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
  const reflectionPrompts = [
    "I can explain the key point of this module in plain language.",
    "I know what this means for my role in the next 30 days.",
    hasQuiz ? "I feel ready for the quick knowledge check next." : "I know my next action after this module.",
  ];

  const rail = (
    <div className="space-y-3">
      <div className="rounded-[16px] border border-[rgba(97,171,230,0.34)] bg-[linear-gradient(180deg,#fffefb_0%,#f6fbff_100%)] p-4 shadow-[0_12px_22px_rgba(12,24,47,0.08)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(27,44,86,0.06)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#17365d]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
          Confidence Check
        </p>
        <p className="mt-2.5 text-[0.92rem] font-bold leading-[1.4] text-[#102445]">
          You&apos;re in module {modulePosition} of {totalModules} core modules.
        </p>
        <p className="mt-1.5 text-[0.75rem] leading-[1.55] text-[#4d6788]">
          {completedModules > 0
            ? `${completedModules} complete so far. The steady path is working.`
            : "You are at the front of the path. Strong start."}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d6e4f2]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(Math.round((modulePosition / Math.max(totalModules, 1)) * 100), 10)}%`,
              background: "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 68%, #df0030 100%)",
            }}
          />
        </div>
      </div>

      <div className="rounded-[16px] border border-[rgba(27,44,86,0.16)] bg-[linear-gradient(180deg,rgba(27,44,86,0.06)_0%,rgba(27,44,86,0.01)_100%)] p-4 shadow-[0_10px_20px_rgba(12,24,47,0.07)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(27,44,86,0.08)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#17365d]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0f7fb3]" />
          Why This Matters
        </p>
        <p className="mt-2.5 text-[0.8rem] leading-[1.62] text-[#234465]">{whyThisMatters}</p>
      </div>

      <div className="rounded-[16px] border border-[rgba(223,0,48,0.18)] bg-[linear-gradient(180deg,rgba(223,0,48,0.05)_0%,rgba(223,0,48,0.01)_100%)] p-4 shadow-[0_10px_20px_rgba(12,24,47,0.07)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(223,0,48,0.08)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#b3234c]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
          Coach Tip
        </p>
        <p className="mt-2.5 text-[0.76rem] leading-[1.62] text-[#5d4964]">{coachTip}</p>
      </div>

      <div className="rounded-[16px] border border-[#c8daef] bg-[linear-gradient(180deg,#fffefb_0%,#f7fbff_100%)] p-4 shadow-[0_12px_22px_rgba(12,24,47,0.08)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(14,165,233,0.08)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#0d5f91]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5d9]" />
          By The End
        </p>
        <div className="mt-2.5 space-y-2">
          {outcomeLines.map((line) => (
            <div key={line} className="flex items-start gap-2.5 text-[0.75rem] leading-[1.55] text-[#274566]">
              <span className="mt-[0.38rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0ea5d9]" />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      {railSections.length > 0 ? (
        <div className="rounded-[16px] border border-[#d6e2ef] bg-[linear-gradient(180deg,#fffefb_0%,#f9fbfe_100%)] p-4 shadow-[0_10px_20px_rgba(12,24,47,0.06)]">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#607895]">In this module</p>
          <div className="mt-2.5 space-y-1.5">
            {railSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex items-start gap-2 rounded-[9px] px-2 py-1.5 text-[0.75rem] text-[#274566] transition-all duration-200 hover:bg-[rgba(14,165,233,0.1)] hover:text-[#0784c4]"
              >
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#17365d] transition-colors group-hover:bg-[#df0030]" />
                <span className="font-semibold leading-[1.3]">{section.title}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderSection = (
    section: { id: string; title?: string; blocks: ModuleContentBlock[] },
    sectionIndex: number,
    style: "featured" | "open"
  ) => {
    const beat = sectionBeat(section.title, sectionIndex);
    const tone = toneStyles(beat.tone);
    const keyLine = sectionKeyLine(section.blocks);
    const isFeatured = style === "featured";

    const content = (
      <>
        <div className={cn(isFeatured ? "mb-5 rounded-[14px] border px-4 py-3" : "mb-5", isFeatured && tone.shell)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", tone.icon)}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="8" cy="8" r="5.3" />
                  <path d="M8 5.3v2.9l2 1.2" />
                </svg>
              </span>
              <div>
                <p className={cn("inline-flex rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.09em]", tone.chip)}>
                  {beat.label}
                </p>
                <p className="mt-1.5 max-w-[54ch] text-[0.76rem] leading-[1.5] text-[#465f7e]">{beat.subtitle}</p>
              </div>
            </div>

            <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.11em] text-[#6a809d]">
              {String(sectionIndex + 1).padStart(2, "0")}
            </span>
          </div>
        </div>

        {section.title ? (
          <h2 className={cn("font-extrabold tracking-[-0.025em] text-[#0d1f3a]", isFeatured ? "mb-3 text-[1.34rem]" : "mb-4 text-[1.48rem]")}>
            {section.title}
          </h2>
        ) : (
          <h2 className={cn("font-extrabold tracking-[-0.025em] text-[#0d1f3a]", isFeatured ? "mb-3 text-[1.34rem]" : "mb-4 text-[1.48rem]")}>
            Start Here
          </h2>
        )}

        {keyLine ? (
          <div className={cn("mb-6 rounded-[12px] px-4 py-3", isFeatured ? "border border-[rgba(14,127,179,0.2)] bg-[rgba(14,127,179,0.05)]" : "border-l-[3px] border-[#df0030] bg-[rgba(223,0,48,0.04)]")}>
            <p className={cn("text-[0.63rem] font-bold uppercase tracking-[0.13em]", isFeatured ? "text-[#0f6799]" : "text-[#b3234c]")}>
              {isFeatured ? "Key takeaway" : "Worth holding onto"}
            </p>
            <p className="mt-1.5 max-w-[58ch] text-[0.88rem] font-medium leading-[1.58] text-[#214566]">{keyLine}</p>
          </div>
        ) : null}

        <div className="space-y-0">
          {section.blocks.map((block, blockIndex) => (
            <div key={`${section.id}-${blockIndex}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(blockIndex, 8) * 25}ms` }}>
              {blockIndex > 0 ? (
                <div className={cn("mb-6 h-px w-full", isFeatured ? "bg-[linear-gradient(90deg,rgba(14,127,179,0.22)_0%,rgba(14,127,179,0.08)_40%,rgba(14,127,179,0)_100%)]" : "bg-[linear-gradient(90deg,rgba(27,44,86,0.18)_0%,rgba(27,44,86,0.05)_36%,rgba(27,44,86,0)_100%)]")} />
              ) : null}
              <ContentBlock block={block} emphasizeLead={block.type === "text" && blockIndex === 0} />
            </div>
          ))}
        </div>
      </>
    );

    if (isFeatured) {
      return (
        <ModulePanel key={section.id} id={section.id} className="scroll-mt-24 max-w-[820px]">
          {content}
        </ModulePanel>
      );
    }

    return (
      <section key={section.id} id={section.id} className="scroll-mt-24 max-w-[760px] px-1 py-4 md:py-7">
        {content}
      </section>
    );
  };

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
      <div className="space-y-8">
        {sections[0] ? renderSection(sections[0], 0, "featured") : null}

        <section className="max-w-[860px] px-1 py-1">
          <div className="mb-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(27,44,86,0.06)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#17365d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
              Human Notes
            </p>
            <h2 className="mt-3 text-[1.42rem] font-extrabold tracking-[-0.03em] text-[#0d1f3a]">
              The part new hires usually want someone to just say out loud
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {humanMoments.map((moment) => (
              <div
                key={moment.title}
                className={cn(
                  "rounded-[16px] px-4 py-4 shadow-[0_10px_20px_rgba(12,24,47,0.06)]",
                  moment.tone === "navy" && "bg-[linear-gradient(180deg,rgba(27,44,86,0.06)_0%,rgba(27,44,86,0.01)_100%)]",
                  moment.tone === "cyan" && "bg-[linear-gradient(180deg,rgba(14,127,179,0.08)_0%,rgba(14,127,179,0.01)_100%)]",
                  moment.tone === "red" && "bg-[linear-gradient(180deg,rgba(223,0,48,0.06)_0%,rgba(223,0,48,0.01)_100%)]"
                )}
                style={{
                  border:
                    moment.tone === "navy"
                      ? "1px solid rgba(27,44,86,0.16)"
                      : moment.tone === "cyan"
                        ? "1px solid rgba(14,127,179,0.18)"
                        : "1px solid rgba(223,0,48,0.16)",
                }}
              >
                <p
                  className="text-[0.62rem] font-bold uppercase tracking-[0.12em]"
                  style={{
                    color:
                      moment.tone === "navy" ? "#17365d" : moment.tone === "cyan" ? "#0d5f91" : "#b3234c",
                  }}
                >
                  {moment.eyebrow}
                </p>
                <h3 className="mt-2 text-[1.02rem] font-bold leading-[1.28] tracking-[-0.02em] text-[#112744]">
                  {moment.title}
                </h3>
                <p className="mt-2 text-[0.82rem] leading-[1.62] text-[#425d7d]">{moment.body}</p>
              </div>
            ))}
          </div>
        </section>

        {sections.slice(1).map((section, index) => renderSection(section, index + 1, "open"))}

        <ModulePanel className="scroll-mt-24">
          <div className="mb-4 flex items-start gap-2.5 rounded-[14px] border border-[rgba(223,0,48,0.2)] bg-[linear-gradient(180deg,rgba(223,0,48,0.05)_0%,rgba(223,0,48,0.01)_100%)] px-4 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(223,0,48,0.1)] text-[#c4234a]">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M8 2.5v6.6" />
                <path d="M5.2 9.2A3.2 3.2 0 1 0 10.8 9.2" />
                <path d="M5 13h6" />
              </svg>
            </span>
            <div>
              <p className="inline-flex rounded-full bg-[#c4234a] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.09em] text-white">
                Quick Reflection
              </p>
              <p className="mt-1.5 text-[0.78rem] leading-[1.5] text-[#5f4962]">
                45-second self-check before you move to the next step.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {reflectionPrompts.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                onClick={() =>
                  setReflectionChecks((prev) => prev.map((checked, i) => (i === index ? !checked : checked)))
                }
                className={cn(
                  "flex w-full items-start gap-3 rounded-[12px] border px-4 py-3 text-left transition-all duration-200",
                  reflectionChecks[index]
                    ? "border-[rgba(14,127,179,0.34)] bg-[rgba(14,127,179,0.08)]"
                    : "border-[rgba(143,171,205,0.34)] bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(248,252,255,0.9)_100%)] hover:border-[rgba(14,127,179,0.3)]"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.62rem] font-bold",
                    reflectionChecks[index]
                      ? "border-[#0f7fb3] bg-[#0f7fb3] text-white"
                      : "border-[#adc5e2] bg-white text-[#6a86a5]"
                  )}
                >
                  {reflectionChecks[index] ? "✓" : index + 1}
                </span>
                <span className="text-[0.84rem] leading-[1.55] text-[#284565]">{prompt}</span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-[0.74rem] text-[#607996]">
            {hasQuiz ? "Next stop: quick knowledge check." : "Next stop: confirmation and completion."}
          </p>
        </ModulePanel>
      </div>
    </ModuleShell>
  );
}
