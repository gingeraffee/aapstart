"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { GutCheckBlock } from "@/components/features/modules/GutCheckBlock";
import { ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Button } from "@/components/ui/Button";
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
  return input.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function stripSectionNumber(value: string): string {
  return value.replace(/^\d+\.\s*/, "").trim();
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

  if (title.includes("how work works")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "You'll reference this one more than once",
        body: "This module covers the practical stuff — attendance, PTO, dress code, and what happens if something goes sideways. Worth paying attention to now so it's not a surprise later.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "The policies here are actually fair",
        body: "AAP's attendance system has built-in ways to recover points, and the PTO policy gets better the longer you're here. It's worth understanding how it works in your favor.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "When in doubt, ask early",
        body: "Whether it's a scheduling conflict, a question about your paycheck, or something that doesn't feel right — raising it early is always the right move. That's what the open door policy is for.",
        tone: "red" as const,
      },
    ];
  }

  if (title.includes("how we show up")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "This one's about behavior, not tasks",
        body: "This module covers how people are expected to show up at AAP — professionally, ethically, and respectfully. It's less about what you do and more about how you do it.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Stay Curious",
        title: "It's okay to ask questions",
        body: "Good questions, steady follow-through, and sound judgment matter more than having all the answers. Nobody expects you to know everything yet.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "You're more ready than you think",
        body: "If you can explain the main ideas back to someone, you are probably more ready than you think.",
        tone: "red" as const,
      },
    ];
  }

  if (title.includes("benefits")) {
    return [
      {
        eyebrow: "In The Loop",
        title: "BambooHR + Paylocity = your command center",
        body: "Your time off, pay, and benefits all live here. Two systems, one source of truth — learn them early and you'll never have to chase anyone down for answers.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Stay Curious",
        title: "Benefits have deadlines that don't care about your busy week",
        body: "Enrollment windows close, PTO doesn't always roll over, and the point system is always running. The questions you put off today have a way of becoming problems next month.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Your attendance record started the day you did",
        body: "The point system doesn't pause for bad weeks. But it does reward good ones — two clean months drops a point, and three in a row earns you $75. The math works in your favor if you let it.",
        tone: "red" as const,
      },
    ];
  }

  if (title.includes("welcome") || title.includes("aap")) {
    return [
      {
        eyebrow: "Reality Check",
        title: "What AAP actually is",
        body: "AAP is a co-op — 2,000+ independent pharmacies that pool resources so they can compete with the big chains. API is the distribution powerhouse, AAP is the competitive support side, and your role is part of what keeps both moving.",
        tone: "navy" as const,
      },
      {
        eyebrow: "What Gets Noticed",
        title: "It's simpler than you'd think",
        body: "Ask good questions. Follow through. Make the next person's job slightly easier than you found it. That's genuinely it. The people who stand out here aren't louder — they're just more reliable.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "First Week Goal",
        title: "Don't memorize everything",
        body: "You're not supposed to have it all figured out. The job this week is to understand the shape of the place — where decisions get made, where to ask for help, and how your role connects to the rest.",
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
      eyebrow: "Stay Curious",
      title: "It's okay to ask questions",
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
  const { effectiveTrack, isPreviewing } = usePreview();
  const [showCongrats, setShowCongrats] = useState(false);
  const [congratsMsg, setCongratsMsg] = useState<{ headline: string; body: string } | null>(null);

  const { data: module, isLoading, error } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);
  const { data: moduleCatalog } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  useEffect(() => {
    if (module && module.status === "published" && !isPreviewing) {
      progressApi.visit(slug).catch(() => {});
    }
  }, [module, slug, isPreviewing]);

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
  // Render as resource/process guide if the module is a management module OR user is on management track
  const isManagement = effectiveTrack === "management" || currentModule.tracks?.includes("management");
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

  // Override first section for How Work Works
  if (currentModule.title.toLowerCase().includes("how work works")) {
    const coverSection = sections.find(
      (s) => s.title?.toLowerCase().includes("stuff everyone assumes") || s.title?.toLowerCase().includes("what this module covers")
    );
    if (coverSection) {
      coverSection.title = "The Stuff Everyone Assumes You Know";
      coverSection.blocks = [
        {
          type: "text",
          content:
            "<p>Policies are more useful when you can see them in action. This module pairs the fine print with real scenarios so you walk away with context, not just rules.</p>",
        },
        {
          type: "text",
          content:
            '<p style="color:#4d6788; margin-top: 0.5rem;">Don\'t worry — we aren\'t judging. This is just to give you some real-life context before we dive into the policies.</p>',
        },
      ];
    }
  }

  // Override Attendance and Timekeeping subsections for How Work Works
  if (currentModule.title.toLowerCase().includes("how work works")) {
    const attendanceSection = sections.find(
      (s) => s.title?.toLowerCase().includes("attendance") && s.title?.toLowerCase().includes("timekeeping")
    );
    if (attendanceSection) {
      // Keep blocks up to but NOT including the aside, then rebuild from there
      const existingBlocks = attendanceSection.blocks;
      const asideIndex = existingBlocks.findIndex((b) => b.type === "aside");
      const keepBlocks = asideIndex >= 0 ? existingBlocks.slice(0, asideIndex) : existingBlocks;

      attendanceSection.blocks = [
        ...keepBlocks,
        // Thresholds heading + aside card + table all in one text block to avoid divider collision
        {
          type: "text",
          content: `<div style="overflow:hidden;">
            <div style="float:right; width:220px; margin-left:20px; margin-bottom:16px; border-left:3px solid #22d3ee; border-radius:0 8px 8px 0; background:var(--color-background-secondary, #f8fbff); padding:0.875rem 1.25rem;">
              <p style="font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-text-tertiary, #607896); margin-bottom:0.4rem;">WORTH NOTING</p>
              <p style="font-size:13px; color:var(--color-text-primary, #112744); line-height:1.6;">The 5-minute grace period isn't a daily strategy. Routinely clocking in at 5:05 will still get flagged.</p>
            </div>
            <p style="font-size:0.95rem; font-weight:700; color:var(--heading-color, #112744); margin-bottom:0.6rem;">Thresholds</p>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div style="display:flex; align-items:flex-start; gap:10px;">
                <span style="color:#22d3ee; font-weight:700; font-size:0.88rem; min-width:18px;">1.</span>
                <span style="font-size:0.88rem; color:var(--color-text-secondary, #4d6788); line-height:1.65;"><strong style="color:var(--color-text-primary, #112744);">First 60 days</strong> — Don't exceed 2.0 points.</span>
              </div>
              <div style="display:flex; align-items:flex-start; gap:10px;">
                <span style="color:#22d3ee; font-weight:700; font-size:0.88rem; min-width:18px;">2.</span>
                <span style="font-size:0.88rem; color:var(--color-text-secondary, #4d6788); line-height:1.65;"><strong style="color:var(--color-text-primary, #112744);">After 60 days</strong> — 8.0 points in a calendar year is the termination threshold.</span>
              </div>
            </div>
          </div>`,
        },
        // Point Rolloff
        {
          type: "text",
          content: `<p style="font-size:0.95rem; font-weight:700; color:var(--heading-color, #112744); margin-bottom:0.4rem;">Point Rolloff</p>
          <p>Points don't stick around forever. There are two ways they come off:</p>
          <div style="display:flex; flex-direction:column; gap:12px; margin-top:0.75rem;">
            <div style="display:flex; align-items:flex-start; gap:10px;">
              <span style="color:#22d3ee; font-weight:700; font-size:0.88rem; min-width:18px;">1.</span>
              <span style="font-size:0.88rem; color:var(--color-text-secondary, #4d6788); line-height:1.65;">Go two consecutive months without a tardy or unexcused absence and 1.0 point drops off automatically.</span>
            </div>
            <div style="display:flex; align-items:flex-start; gap:10px;">
              <span style="color:#22d3ee; font-weight:700; font-size:0.88rem; min-width:18px;">2.</span>
              <span style="font-size:0.88rem; color:var(--color-text-secondary, #4d6788); line-height:1.65;">Any point that hasn't rolled off early will fall off on the first of the same month the following year.</span>
            </div>
          </div>
          <div style="height:0.75rem;"></div>`,
        },
        // Perfect Attendance Bonus (demoted label)
        {
          type: "text",
          content: `<p style="font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-secondary, #607896); margin-bottom:0.4rem;">Perfect Attendance Bonus</p>
          <p style="font-size:0.88rem; color:var(--color-text-secondary, #4d6788); line-height:1.65;">Three consecutive months with no tardies or unexcused absences earns you a $75 bonus on your first check of the following month. Yes, really.</p>`,
        },
        // Reporting (demoted label)
        {
          type: "text",
          content: `<p style="font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-secondary, #607896); margin-bottom:0.4rem;">Reporting</p>
          <p style="font-size:0.88rem; color:var(--color-text-secondary, #4d6788); line-height:1.65;">If you're going to be late or absent, report it within 15 minutes of your scheduled shift start. Log it in BambooHR, or contact your supervisor or HR directly if you don't have access.</p>`,
        },
      ];
    }
  }

  // Gut Check scenarios for How Work Works
  const howWorkWorksGutChecks = currentModule.title.toLowerCase().includes("how work works") ? [
    {
      scenario: "Your shift ends at 5:00 and your supervisor asks you to stay until 6:30 to help finish a rush order. What's the right move?",
      options: [
        { id: "a", text: "Stay and log the extra time — you'll get paid either way" },
        { id: "b", text: "Stay, but don't clock the extra time since it was a favor" },
        { id: "c", text: "Get overtime approved before working the extra hours" },
        { id: "d", text: "Tell your supervisor you can't stay without 24 hours notice" },
      ],
      correctId: "c",
      explanation: "Overtime must always be approved before it's worked. Even if your supervisor asks directly, the approval step still applies. It protects both of you.",
    },
    {
      scenario: "You've been clocking in at 8:04 every morning for the past two weeks. Your shift starts at 8:00. Are you in the clear?",
      options: [
        { id: "a", text: "Yes — it's within the 5-minute grace period" },
        { id: "b", text: "No — routinely using the grace period can still get flagged" },
        { id: "c", text: "Yes — as long as you're within 5 minutes, there's no consequence" },
        { id: "d", text: "No — anything after 8:00 is an automatic half-point" },
      ],
      correctId: "b",
      explanation: "The 5-minute grace period isn't a daily strategy. Routinely clocking in at the edge will get noticed and may result in corrective action, even if no individual day triggers a point.",
    },
    {
      scenario: "A coworker makes an offhand comment that feels disrespectful, but it wasn't directed at you. You're not sure if it's worth bringing up. What do you do?",
      options: [
        { id: "a", text: "Ignore it — it wasn't about you" },
        { id: "b", text: "Confront the coworker directly and tell them to stop" },
        { id: "c", text: "Mention it to your supervisor or HR — that's what the open door policy is for" },
        { id: "d", text: "Wait and see if it happens again before doing anything" },
      ],
      correctId: "c",
      explanation: "The open door policy exists for exactly this kind of situation. You don't have to wait for something to escalate. Raising it early — with your supervisor or HR — is always the right call.",
    },
  ] : [];

  // Gut Check scenarios for Benefits, Pay & Time Away
  const benefitsGutChecks = currentModule.title.toLowerCase().includes("benefits") ? [
    {
      scenario: "You need to leave 2 hours early on Friday for a dentist appointment. What's the smallest amount of personal leave you can use?",
      options: [
        { id: "a", text: "Half a day" },
        { id: "b", text: "2 hours" },
        { id: "c", text: "1 hour" },
        { id: "d", text: "You have to take the full day" },
      ],
      correctId: "c",
      explanation: "Personal leave can be used in 1-hour increments — so you only need to use exactly what you need. Vacation time, on the other hand, has a 2-hour minimum.",
    },
    {
      scenario: "A paid holiday falls during your first month on the job. What happens?",
      options: [
        { id: "a", text: "You get holiday pay like everyone else" },
        { id: "b", text: "You work the holiday and get overtime" },
        { id: "c", text: "You get the day off but without pay" },
        { id: "d", text: "You get a floating holiday to use later" },
      ],
      correctId: "c",
      explanation: "Holiday pay doesn't kick in until after 60 calendar days of full-time employment. You'll still get the day off if AAP is closed, but it won't be paid until you hit that milestone.",
    },
    {
      scenario: "You want to take a week-long trip for your anniversary. You have the PTO balance. What else do you need?",
      options: [
        { id: "a", text: "Nothing — just submit it in BambooHR" },
        { id: "b", text: "A verbal okay from your supervisor" },
        { id: "c", text: "Written approval from the Company President" },
        { id: "d", text: "HR has to sign off on anything over 3 days" },
      ],
      correctId: "c",
      explanation: "Any vacation request over 5 consecutive days requires written approval from the Company President. Having the PTO balance isn't enough — plan ahead for that extra step.",
    },
  ] : [];

  // Override "What This Module Covers" for How We Show Up
  if (currentModule.title.toLowerCase().includes("how we show up")) {
    const coverSection = sections.find(
      (s) => s.title?.toLowerCase().includes("what this module covers")
    );
    if (coverSection) {
      coverSection.title = "Good People Who Do Great Work";
      coverSection.blocks = [
        {
          type: "text",
          content:
            "<p>This module is about how people are expected to show up at AAP — not just what they do, but how they do it. That covers professionalism, ethics, accountability, and what to do when something doesn't feel right.</p>" +
            '<p style="color:#4d6788">Watch Jon Copeland explain how employees make a difference every day...</p>',
        },
        {
          type: "video",
          src: "https://www.youtube.com/embed/I1RvGairzZM?si=4YAX0Q8w7XxeFSPp&rel=0&modestbranding=1",
          alt: "AAP Values",
        },
      ];
    }
  }

  // Override "Mission, Vision, and Values" section content
  const missionSection = sections.find(
    (s) => s.title?.toLowerCase().includes("mission") && s.title?.toLowerCase().includes("values")
  );
  if (missionSection) {
    missionSection.blocks = [
      {
        type: "text",
        content:
          "<p>AAP exists to help independent pharmacies stay profitable, competitive, and focused on patient care — so the corner drugstore can keep doing what the big chains can't: actually knowing their customers.</p>",
      },
      {
        type: "text",
        content: "<p><strong>Here's what that looks like in practice:</strong></p>",
      },
      {
        type: "list",
        items: [
          "Customer focus — Every decision runs through one question: does this help the pharmacies we serve? Not eventually. Now.",
          "Integrity — We say what we mean, do what we say, and don't dress up bad news. Independent pharmacies trust us with their business — that's not something we take lightly.",
          "Respect — For our pharmacies, our coworkers and most importantly the patients depending on us. Everyone in this chain matters.",
          "Excellence — Good enough isn't a finish line. The pharmacies we support are competing against billion-dollar chains — they need us sharp.",
          "Ownership — If you see something that needs handling, you handle it. We don't have a department for passing the buck.",
        ],
      } as ModuleContentBlock,
    ];
  }

  const railWarningBlocks =
    isManagement && sections[0]
      ? sections[0].blocks.filter(
          (block) => block.type === "callout" && block.variant === "warning"
        )
      : [];

  const displaySections =
    isManagement && sections.length > 0
      ? sections
          .map((section, index) =>
            index === 0
              ? {
                  ...section,
                  blocks: section.blocks.filter(
                    (block) => !(block.type === "callout" && block.variant === "warning")
                  ),
                }
              : section
          )
          .filter((section) => section.blocks.length > 0)
      : sections;

  const firstKeyLine = sectionKeyLine(displaySections[0]?.blocks ?? []);
  const liveModules = (moduleCatalog ?? [])
    .filter((item) => item.status === "published")
    .sort((a, b) => a.order - b.order);
  const modulePosition = liveModules.findIndex((item) => item.slug === currentModule.slug) + 1 || currentModule.order;
  const totalModules = liveModules.length || currentModule.order;
  const completedModules = (progress ?? []).filter((item) => item.module_completed).length;
  const coachTip = coachTipForModule(currentModule.title, hasQuiz, hasAcknowledgement);
  const outcomeLines = buildOutcomeLines(displaySections, hasQuiz, hasAcknowledgement);
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

  const railSections = displaySections.filter((section) => section.title);
  const downloadBlocks = currentModule.content_blocks.filter(
    (b) => b.type === "download" || b.type === "link"
  );

  const rail = isManagement ? (
    <div className="space-y-4">
      {railSections.length > 0 ? (
        <div className="pb-3" style={{ borderBottom: "1px solid var(--mgmt-section-divider)" }}>
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--mgmt-eyebrow-text)" }}>On this page</p>
          <div className="mt-2.5 space-y-0.5">
            {railSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex items-start gap-2 rounded-[7px] px-2 py-1.5 text-[0.74rem] transition-all duration-200 hover:bg-[rgba(14,165,233,0.08)]"
                style={{ color: "var(--module-body)" }}
              >
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full transition-colors" style={{ backgroundColor: "var(--mgmt-step-text)", opacity: 0.5 }} />
                <span className="font-medium leading-[1.3]">{stripSectionNumber(section.title ?? "")}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {downloadBlocks.length > 0 ? (
        <div className="rounded-[16px] border border-[#d6e2ef] bg-[linear-gradient(180deg,#fffefb_0%,#f9fbfe_100%)] p-4 shadow-[0_10px_20px_rgba(12,24,47,0.06)]">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#607895]">Downloads</p>
          <div className="mt-2.5 space-y-2">
            {downloadBlocks.map((block, idx) => (
              <a
                key={idx}
                href={block.url ?? "#"}
                download={block.type === "download" ? "" : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2.5 rounded-[9px] px-2 py-2 text-[0.75rem] transition-all duration-200 hover:bg-[rgba(14,165,233,0.1)]"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px]" style={{ background: "rgba(14,118,189,0.1)" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#0e76bd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v8M5 7l3 3 3-3" />
                    <path d="M3 12h10" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-[1.3] text-[#0e76bd] group-hover:underline">{block.label ?? "Download"}</span>
                  {block.description ? <span className="mt-0.5 block text-[0.7rem] leading-[1.4] text-[#607895]">{block.description}</span> : null}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {railWarningBlocks.length > 0 ? (
        <div className="space-y-2">
          {railWarningBlocks.map((block, idx) => (
            <ContentBlock
              key={`rail-warning-${idx}`}
              block={block}
              variant="resource"
            />
          ))}
        </div>
      ) : null}
    </div>
  ) : (
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
    const isTimeline = isManagement && !isFeatured;

    const heading = isTimeline ? (
      // Timeline heading: eyebrow + clean heading (no cyan bar)
      <div className="mb-5">
        <p className="mgmt-step-eyebrow">Step {sectionIndex}</p>
        <h2 className="mgmt-step-heading">
          {section.title ? stripSectionNumber(section.title.replace(/\?$/, "")) : "Overview"}
        </h2>
      </div>
    ) : (
      // Standard heading with cyan gradient bar
      <div className={cn("flex items-center gap-3", isFeatured ? "mb-3" : "mb-4")}>
        <span className="h-5 w-[3px] shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, #22d3ee 0%, #0ea5d9 100%)" }} />
        <h2 className={cn("font-extrabold tracking-[-0.025em] text-[#0d1f3a]", isFeatured ? "text-[1.34rem]" : "text-[1.48rem]")}>
          {section.title ? stripSectionNumber(section.title.replace(/\?$/, "")) : (isManagement ? "Overview" : "Start Here")}
        </h2>
      </div>
    );

    const content = (
      <>
        {heading}

        <div className="space-y-0">
          {section.blocks.map((block, blockIndex) => (
            <div key={`${section.id}-${blockIndex}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(blockIndex, 8) * 25}ms` }}>
              {blockIndex > 0 ? (
                <div className={cn("mb-6 h-px w-full", isFeatured ? "bg-[linear-gradient(90deg,rgba(14,127,179,0.22)_0%,rgba(14,127,179,0.08)_40%,rgba(14,127,179,0)_100%)]" : "bg-[linear-gradient(90deg,rgba(27,44,86,0.18)_0%,rgba(27,44,86,0.05)_36%,rgba(27,44,86,0)_100%)]")} />
              ) : null}
              <ContentBlock block={block} emphasizeLead={block.type === "text" && blockIndex === 0} variant={isManagement ? "resource" : "training"} />
            </div>
          ))}
        </div>
        {!isManagement && isFeatured && howWorkWorksGutChecks.length > 0 && (
          <div className="mt-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <GutCheckBlock scenarios={howWorkWorksGutChecks} />
          </div>
        )}
        {!isManagement && isFeatured && benefitsGutChecks.length > 0 && (
          <div className="mt-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <GutCheckBlock scenarios={benefitsGutChecks} />
          </div>
        )}
      </>
    );

    if (isFeatured) {
      return (
        <ModulePanel key={section.id} id={section.id} className="scroll-mt-24 w-full">
          {content}
        </ModulePanel>
      );
    }

    // Management timeline layout: step marker + content on open background
    if (isManagement) {
      return (
        <section key={section.id} id={section.id} className="mgmt-timeline-section scroll-mt-24">
          <div className="mgmt-timeline-row">
            <div className="mgmt-timeline-marker">
              <span className="mgmt-step-number">{sectionIndex}</span>
            </div>
            <div className="mgmt-timeline-content">
              {content}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section key={section.id} id={section.id} className="scroll-mt-24 w-full px-1 py-1 md:py-2">
        {content}
      </section>
    );
  };

  return (
    <>
      {!isManagement && showCongrats && congratsMsg ? (
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
        breadcrumbs={isManagement
          ? [{ label: "Manager Resources", href: "/overview" }, { label: currentModule.title }]
          : [{ label: "My Path", href: "/overview" }, { label: currentModule.title }]
        }
        moduleOrder={currentModule.order}
        stageLabel={isManagement ? "Process Guide" : "Learn"}
        headline={currentModule.title}
        description={
          isManagement
            ? (currentModule.description || "Reference guide for this management process.")
            : (currentModule.description || "Work through the key ideas below, then move to the next step when it feels clear.")
        }
        estimatedMinutes={currentModule.estimated_minutes}
        steps={steps}
        rail={rail}
        footer={null}
        variant={isManagement ? "resource" : "training"}
      >
        <div className={cn("space-y-2", isManagement && "mgmt-timeline")}>
        {displaySections[0] ? renderSection(displaySections[0], 0, "featured") : null}

        {!isManagement && (
        <section
          className="relative overflow-hidden"
          style={{
            padding: "2rem 2.5rem 2.25rem",
            background: "rgba(10, 22, 40, 0.04)",
            borderTop: "0.5px solid rgba(10, 22, 40, 0.08)",
            borderBottom: "0.5px solid rgba(10, 22, 40, 0.08)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-8 h-36 w-36 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(15,127,179,0.10) 0%, rgba(15,127,179,0) 72%)" }}
          />
          <div
            className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(223,0,48,0.07) 0%, rgba(223,0,48,0) 72%)" }}
          />
          <div className="relative mb-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(27,44,86,0.06)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#17365d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
              Human Notes
            </p>
            <h2 className="mt-3 text-[1.42rem] font-medium tracking-[-0.03em] text-[#0d1f3a]">
              The part new hires usually want someone to just say out loud
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
            {humanMoments.map((moment) => (
              <div key={moment.title}>
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
        )}

        {displaySections.slice(1).map((section, index) => renderSection(section, index + 1, "open"))}

        {isManagement ? (
        <div className="mt-10 pt-5" style={{ borderTop: "1px solid var(--mgmt-section-divider)" }}>
          <Link href="/overview" className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold transition-colors hover:opacity-80" style={{ color: "var(--module-context)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Back to resources
          </Link>
        </div>
        ) : (
        <div className="mt-10 flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: "1px solid var(--mgmt-section-divider)" }}>
          <Link href="/overview" className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold transition-colors" style={{ color: "var(--module-context)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Back to my path
          </Link>
          <div className="flex flex-col items-end gap-1.5">
            <Button onClick={handleFinished} className="h-[2.8rem] px-6 text-[0.88rem]">
              {continueLabel}
            </Button>
            <p className="text-[0.73rem]" style={{ color: "var(--module-context)" }}>{nextStepLabel}</p>
          </div>
        </div>
        )}
      </div>
    </ModuleShell>
    </>
  );
}

