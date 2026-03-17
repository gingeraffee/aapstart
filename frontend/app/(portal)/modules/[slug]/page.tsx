"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ContentBlock as ModuleContentBlock, ModuleDetail, ModuleSummary, ProgressRecord } from "@/lib/types";

const CONGRATS_MESSAGES: ((name: string, moduleTitle: string) => { headline: string; body: string })[] = [
  (name, title) => ({
    headline: `Crushed it, ${name}.`,
    body: `"${title}" is done and dusted. You just leveled up your AAP knowledge — and honestly, you made it look easy.`,
  }),
  (name) => ({
    headline: `Look at you go, ${name}.`,
    body: `Another module down, another step closer to feeling like you've been here for years. Spoiler: you're already ahead of the curve.`,
  }),
  (name, title) => ({
    headline: `${name}, that's a wrap.`,
    body: `You just locked in "${title}" like a pro. Your future self is going to thank you for paying attention.`,
  }),
  (name) => ({
    headline: `Gold star, ${name}.`,
    body: `Module complete. Knowledge acquired. Confidence boosted. That's what we like to see on day one.`,
  }),
  (name, title) => ({
    headline: `Nailed it, ${name}.`,
    body: `"${title}" — done. You're building the foundation that makes everything else click. Keep that energy.`,
  }),
  (name) => ({
    headline: `${name} is on a roll.`,
    body: `Every module you finish makes the next one easier. You're stacking wins and it shows.`,
  }),
  (name, title) => ({
    headline: `That's how it's done, ${name}.`,
    body: `"${title}" is officially in the books. The team's getting a good one — we can already tell.`,
  }),
  (name) => ({
    headline: `Boom. Done, ${name}.`,
    body: `You're moving through onboarding like you've got somewhere to be. (You do — it's called your new role, and you're going to be great at it.)`,
  }),
];

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
  const { user } = useAuth();
  const [reflectionChecks, setReflectionChecks] = useState([false, false, false]);
  const [showCongrats, setShowCongrats] = useState(false);
  const [congratsMsg, setCongratsMsg] = useState<{ headline: string; body: string } | null>(null);

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

  const continueLabel = "I'm Finished!";

  const nextStepLabel = hasAcknowledgement
    ? "Next up: confirmation"
    : hasQuiz
      ? "Next up: quiz"
      : "Next up: completion";

  function handleFinished() {
    const firstName = user?.first_name ?? "there";
    const msg = CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)];
    setCongratsMsg(msg(firstName, currentModule.title));
    setShowCongrats(true);
  }

  function handleCongratsConfirm() {
    setShowCongrats(false);
    if (hasAcknowledgement) {
      router.push(`/modules/${slug}/acknowledge`);
    } else if (hasQuiz) {
      router.push(`/modules/${slug}/quiz`);
    } else {
      router.push(`/modules/${slug}/complete`);
    }
  }

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

      <div className="rounded-[16px] border border-[rgba(223,0,48,0.18)] bg-[linear-gradient(180deg,rgba(223,0,48,0.05)_0%,rgba(223,0,48,0.01)_100%)] p-4 shadow-[0_10px_20px_rgba(12,24,47,0.07)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(223,0,48,0.08)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#b3234c]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
          Coach Tip
        </p>
        <p className="mt-2.5 text-[0.76rem] leading-[1.62] text-[#5d4964]">{coachTip}</p>
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
    const isFeatured = style === "featured";

    const content = (
      <>
        {section.title ? (
          <h2 className={cn("font-extrabold tracking-[-0.025em] text-[#0d1f3a]", isFeatured ? "mb-3 text-[1.34rem]" : "mb-4 text-[1.48rem]")}>
            {section.title}
          </h2>
        ) : (
          <h2 className={cn("font-extrabold tracking-[-0.025em] text-[#0d1f3a]", isFeatured ? "mb-3 text-[1.34rem]" : "mb-4 text-[1.48rem]")}>
            Start Here
          </h2>
        )}

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
        <ModulePanel key={section.id} id={section.id} className="scroll-mt-24 w-full">
          {content}
        </ModulePanel>
      );
    }

    return (
      <section key={section.id} id={section.id} className="scroll-mt-24 w-full px-1 py-4 md:py-7">
        {content}
      </section>
    );
  };

  return (
    <>
      {showCongrats && congratsMsg ? (
        <>
          <style>{`
            @keyframes congrats-in {
              0% { opacity: 0; transform: translateY(12px) scale(0.97); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes congrats-bg-in {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `}</style>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(15, 32, 58, 0.58)", backdropFilter: "blur(5px)", animation: "congrats-bg-in 200ms ease-out both" }}
          >
            <div
              className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-[#c2daf1] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] shadow-[0_24px_56px_rgba(9,20,41,0.24)]"
              style={{ animation: "congrats-in 280ms ease-out both" }}
            >
              <div className="h-1 w-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_52%,#df0030_100%)]" />
              <div className="px-8 pb-8 pt-7 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#9dd2ef] bg-[#eaf6ff] text-[#0f6da3]">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5 9.5 18 20 6" />
                  </svg>
                </div>
                <h2 className="text-[1.6rem] font-extrabold leading-[1.12] tracking-[-0.025em] text-[#0f1d3c]">
                  {congratsMsg.headline}
                </h2>
                <p className="mt-3 text-[0.88rem] leading-[1.68] text-[#445b78]">
                  {congratsMsg.body}
                </p>
                <button
                  onClick={handleCongratsConfirm}
                  className="mt-6 w-full rounded-[12px] border border-[#6eaeea] bg-[linear-gradient(135deg,#184371_0%,#13629a_100%)] py-3 text-[0.9rem] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_18px_rgba(15,127,179,0.24)]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <ModuleShell
        breadcrumbs={[
          { label: "My Path", href: "/overview" },
          { label: currentModule.title },
        ]}
        moduleOrder={currentModule.order}
        stageLabel="Learn"
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
            onCtaClick={handleFinished}
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
    </>
  );
}

