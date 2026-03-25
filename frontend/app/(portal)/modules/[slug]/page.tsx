"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { GuidanceAccordion } from "@/components/features/modules/GuidanceAccordion";
import { GutCheckBlock } from "@/components/features/modules/GutCheckBlock";
import { ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ContentBlock as ModuleContentBlock, ModuleDetail, ModuleSummary, ProgressRecord } from "@/lib/types";

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
    if (/^<h2[^>]*>/i.test(part)) {
      return {
        type: "heading",
        content: stripHtml(part),
      };
    }
    if (/^<h3[^>]*>/i.test(part)) {
      return {
        type: "subheading",
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

function coachTipsForModule(moduleTitle: string, hasQuiz: boolean, hasAcknowledgement: boolean): string[] {
  const title = moduleTitle.toLowerCase();

  if (title.includes("welcome") || (title.includes("aap") && !title.includes("show up"))) {
    return [
      "Look for the big-picture story, not trivia. If you can explain how AAP works in plain language, you are on track.",
      "Pay attention to who does what and where. You will reference the org structure more than you think.",
      "This is context, not a test. Let the mission and values sink in — they show up in everything else.",
      "Think about how you would describe AAP to someone who has never heard of it. That is the level of understanding to aim for.",
    ];
  }

  if (title.includes("how we show up")) {
    return [
      "This one is about behavior, not tasks. Focus on the standards you would want someone to hold you to.",
      "The confidentiality rules here are non-negotiable. If only one section sticks, make it that one.",
      "Pay attention to the approved default language. You will use those phrases more than you expect.",
      "Think about what you would do if you were unsure whether something was confidential. That instinct matters here.",
    ];
  }

  if (title.includes("where to go")) {
    return [
      "This module is your safety net. Know where to send people — you do not have to have all the answers yourself.",
      "Bookmark the key contacts and resources. When someone asks for help, speed matters more than memory.",
      "Focus on the routing — who handles what. That one skill will save you the most time in your first month.",
    ];
  }

  if (title.includes("benefits") || title.includes("pay") || title.includes("time away")) {
    return [
      "You will get more benefits questions than almost anything else. Know the timeline milestones cold.",
      "Pay attention to what is paid out at termination vs. what is forfeited. That question comes up a lot.",
      "The 401(k) match formula and PTO increments are the two things employees ask about most. Worth memorizing.",
      "If a benefits question feels complicated, route it. Your job is accuracy, not speed.",
    ];
  }

  if (title.includes("safety")) {
    return [
      "Read this one like you might need it on a busy day. The goal is quick recall, not perfect wording.",
      "Safety reporting is never optional. If something feels off, document it and escalate — every time.",
      "Focus on what to do first, not every detail. In a real situation, knowing the first step is what matters.",
      "This is one module where over-reporting is always better than under-reporting.",
    ];
  }

  if (title.includes("toolkit")) {
    return [
      "Anchor on where things live and when to use them. That will save more time than memorizing every detail.",
      "The PayClock and BambooHR workflows are your bread and butter. These are worth practicing, not just reading.",
      "Pay attention to the escalation triggers in each system. Knowing when to stop and ask is just as important as knowing the steps.",
      "Bookmark the system links now. You will open these pages dozens of times a week.",
    ];
  }

  if (title.includes("impact") || title.includes("responsibilities") || title.includes("workflow")) {
    return [
      "This is your operating manual. Come back to it whenever you are unsure what you own vs. what belongs to someone else.",
      "The weekly payroll cycle is the backbone of your rhythm. Get this flow down and everything else gets easier.",
      "Focus on the ownership boundaries. Knowing what is not your job is just as important as knowing what is.",
      "Your 30/60/90 plan is a guide, not a test. Use it to check your own progress, not to stress about deadlines.",
    ];
  }

  if (title.includes("how work works")) {
    return [
      "You will reference this one more than once. The attendance points and PTO rules come up constantly.",
      "FMLA is the one area where you escalate immediately, every time, no exceptions. That rule is worth repeating.",
      "The corrective action thresholds are worth memorizing: 5, 6, 7, 8. You will need them during payroll weeks.",
      "If an employee asks a policy question and you are not 100% sure, route it. Guessing in HR has real consequences.",
    ];
  }

  if (title.includes("say it") || title.includes("solve it") || title.includes("communication") || title.includes("escalation")) {
    return [
      "The scripts are not meant to be read word-for-word. Learn the structure, then make it sound like you.",
      "When in doubt about tone, default to professional and warm. You can always follow up — you cannot unsend.",
      "The escalation routing table is your cheat sheet. Print it or bookmark it for your first few weeks.",
      "Pay questions always go to the HR Manager. That is the one routing rule with zero exceptions.",
    ];
  }

  if (title.includes("before the offer")) {
    return [
      "The recruiting workflow is triggered by BambooHR status changes. Check statuses daily — do not wait for someone to tell you.",
      "Drug screening timelines are strict: 3 business days. Build that into your calendar the moment an offer is signed.",
      "Reference checks have hard rules about what you cannot ask. Review the prohibited questions before your first call.",
      "Memphis and Scottsboro have different screening workflows. Mixing them up creates real delays.",
    ];
  }

  if (title.includes("after the offer")) {
    return [
      "The onboarding checklist has 12 steps for a reason. Skipping one creates downstream problems for payroll or IT.",
      "State tax forms trip people up. If the employee is not in TN or AL, you need to manually add the right form.",
      "File documents in the correct BambooHR folders the first time. Re-filing is twice the work.",
      "The employee number is TBA[Hire Date] until a permanent one is assigned. Do not leave it blank.",
    ];
  }

  if (title.includes("exit") || title.includes("offboarding")) {
    return [
      "Involuntary terminations are HR Manager territory. Your role is support and documentation, never communication.",
      "The 2-day no-call/no-show rule is policy, not a judgment call. Notify HR Manager immediately when it happens.",
      "Vacation pays out at termination. Personal leave does not. Know the difference — employees will ask.",
    ];
  }

  if (title.includes("quick reference") || title.includes("key people")) {
    return [
      "This page is your desk reference. Bookmark it, print it, whatever works — just keep it within reach.",
      "The SOP index tells you exactly which document to open for any task. Use it instead of guessing.",
      "Key contacts prefer Teams for most things. Save the phone calls for urgent escalations.",
    ];
  }

  if (title.includes("first 30") || title.includes("first 90") || title.includes("first day")) {
    return [
      "Your first month is about building habits, not proving yourself. Ask every question that comes to mind.",
      "Write things down as you learn them. Your notes from week one will be your best resource in week four.",
      "Nobody expects perfection in the first 90 days. They expect curiosity, follow-through, and honesty.",
    ];
  }

  if (title.includes("final review")) {
    return [
      "This is your chance to prove to yourself how much you have learned. Trust what you know.",
      "If a scenario feels tricky, go back to the basics: what do you own, what do you escalate, and who do you call?",
      "You have made it through the full journey. Take a breath and finish strong.",
    ];
  }

  // Fallback pool
  const fallback = [
    "Take this section by section and keep your eye on what you would actually use in the role. Clarity beats speed here.",
    "Read once for signal, then once for confidence. If a point feels repeatable, it will probably show up in the quick check.",
    "Focus on the parts you would feel comfortable standing behind. That usually points to what matters most.",
    "Think about what question a new employee might ask you about this topic. If you can answer it, you are ready.",
  ];
  return fallback;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

  // ── Support, Leave & Resources ("Where To Go") ──
  if (title.includes("where to go") || title.includes("support") || title.includes("leave")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Not all time away works the same",
        body: "PTO, medical leave, FMLA, and personal days all follow different rules. Don't assume one covers another — the sooner you understand the difference, the fewer surprises you'll have.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "The EAP is available from day one",
        body: "If you or someone in your household needs support — counseling, legal advice, financial guidance — the Employee Assistance Program is free and confidential. You don't have to wait for a crisis to use it.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Know who to call before you need to",
        body: "Your supervisor is your go-to for day-to-day support and can direct you when HR or IT needs to be involved. For anything sensitive, confidential, or just uncomfortable to bring up — the HR Manager is always ready and available to help.",
        tone: "red" as const,
      },
    ];
  }

  // ── Safety at AAP ──
  if (title === "safety at aap") {
    return [
      {
        eyebrow: "Non-Negotiable",
        title: "Safety isn't a department — it's everyone's job",
        body: "Whether you're in the warehouse, the office, or visiting a location — if you see something unsafe, say something. Reporting a hazard is never an overreaction.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Heads Up",
        title: "Injuries get reported immediately",
        body: "Not at the end of your shift, not the next day — immediately to your supervisor. Delays create problems for you and make it harder for the company to help.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "You won't get in trouble for raising a concern",
        body: "AAP takes workplace safety seriously and that includes making sure people feel safe speaking up. If something doesn't feel right, the open-door policy exists for exactly that reason.",
        tone: "red" as const,
      },
    ];
  }

  // ── Your Toolkit (general) ──
  if (title === "your toolkit" && !title.includes("hr")) {
    return [
      {
        eyebrow: "Start Here",
        title: "BambooHR is your home base",
        body: "Your profile, your documents, your tasks — it all lives in BambooHR. Complete your profile and check the Emergency tab early. Everything else flows from there.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Paylocity is where your money lives",
        body: "Pay stubs, tax forms, direct deposit, address changes — that's all Paylocity. You can even access your paycheck early if you set it up. Worth doing in your first week.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Don't Sleep On This",
        title: "LinkedIn Learning is free and it's actually good",
        body: "10,000+ courses, company-provided, no cost to you. Whether you want to sharpen a skill or explore something new, the access is already there. Use it.",
        tone: "red" as const,
      },
    ];
  }

  // ── Your Toolkit — HR ──
  if (title.includes("your toolkit") && title.includes("hr")) {
    return [
      {
        eyebrow: "Critical",
        title: "You'll live in five systems — learn them early",
        body: "BambooHR, PayClock, Employvio, Paylocity, and the HR Drive. Each one does something different and you'll touch most of them daily. Getting comfortable now saves you time every single day.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Heads Up",
        title: "PayClock has workflows that trip people up",
        body: "Polling timeclocks, entering PTO, editing punches — they each have specific steps. The shift naming convention matters too: active shifts always start with 'NEW.' Small details, big consequences.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Non-Negotiable",
        title: "Passwords go in Proton Pass — nowhere else",
        body: "Not in emails, not in Teams, not in shared docs, not on sticky notes. Proton Pass is the only approved place to store credentials. This is a hard rule.",
        tone: "red" as const,
      },
    ];
  }

  // ── Exits & Offboarding ──
  if (title.includes("exits") || title.includes("offboarding")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Final pay depends on how someone leaves",
        body: "Vacation gets paid out, but personal leave and long-term sick time don't. Voluntary and involuntary separations follow different timelines. Understanding the rules now prevents awkward conversations later.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Two no-call/no-shows means voluntary quit",
        body: "If someone doesn't show up and doesn't call in for two consecutive days, that's treated as a voluntary resignation. It's not a gray area — know the policy so you can communicate it clearly.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "System access gets cut fast",
        body: "When someone separates, their access to company systems is removed quickly — sometimes the same day. That's not personal, it's protocol. The smoother the process, the better for everyone.",
        tone: "red" as const,
      },
    ];
  }

  // ── Say It & Solve It ──
  if (title.includes("say it") || title.includes("solve it")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "There are scripts for the tricky conversations",
        body: "Timecard exceptions, pay questions, harassment intake — this module gives you actual scripts. You don't have to improvise the hard stuff. Use the templates until they feel natural.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Non-Negotiable",
        title: "Pay questions always go to the HR Manager",
        body: "Never share pay information with anyone, even if the employee is asking about their own. Route it to the HR Manager every time. No exceptions, no shortcuts.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Documentation isn't optional — it's protection",
        body: "Date, time, method, what was asked, what was said, follow-up needed. If you didn't write it down, it didn't happen. This protects you, the employee, and the company.",
        tone: "red" as const,
      },
    ];
  }

  // ── Final Review ──
  if (title.includes("final review")) {
    return [
      {
        eyebrow: "Almost There",
        title: "This is a recap, not a test",
        body: "The final review pulls together everything you've already learned. If you've been paying attention along the way, you're already prepared. This is about confirming what you know — not catching what you missed.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "The scenarios are based on real situations",
        body: "The quiz questions reflect actual workplace situations — privacy, FMLA, timekeeping, PTO disputes. They're designed to check your judgment, not your memory of exact policy numbers.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "What Happens Next",
        title: "Passing this unlocks your completion",
        body: "Once you clear the final review, your onboarding journey is officially complete. Take your time, trust what you've learned, and finish strong.",
        tone: "red" as const,
      },
    ];
  }

  // ── Where You Make an Impact — HR ──
  if (title.includes("your impact") || (title.includes("impact") && title.includes("hr"))) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Your day has a rhythm — learn it fast",
        body: "Morning: emails, timeclock polling, onboarding tasks. Midday: follow-ups. End of day: filing and updates. The daily routine is your anchor. Once it clicks, everything else gets easier.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Know what you own — and what you don't",
        body: "You own timekeeping, PTO, onboarding follow-ups, recruiting scheduling, and basic policy questions. IT owns computer privileges. The HR Manager owns pay, discipline, investigations, and FMLA. Stay in your lane and you'll be fine.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "The payroll cycle doesn't wait for anyone",
        body: "Tuesday at 6 PM is the submit deadline. Every step before that — polling, verifying, reconciling — has to happen on time. Miss a step and the whole chain feels it.",
        tone: "red" as const,
      },
    ];
  }

  // ── Where You Make an Impact — Warehouse ──
  if (title.includes("impact") && title.includes("warehouse")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Accuracy matters more than speed",
        body: "You'll hear a lot about efficiency, but the warehouse runs on getting things right. A fast mistake still creates rework. Consistent accuracy is what earns trust.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "What 'good' looks like is simpler than you'd think",
        body: "Show up, communicate, follow procedures, and escalate when something's off. Consistency beats perfection here. The people who do well aren't flashy — they're reliable.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Your work connects to real patients",
        body: "Every label scanned, every order picked, every box checked — it all flows downstream to pharmacies that serve real people. That's not a motivational poster. That's literally the job.",
        tone: "red" as const,
      },
    ];
  }

  // ── Where You Make an Impact — Administrative ──
  if (title.includes("impact") && title.includes("administrative")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Your consistency keeps operations moving",
        body: "Administrative roles don't always get the spotlight, but when file maintenance, communication routing, and issue tracking run smoothly — everyone notices. When they don't, everyone really notices.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Reliability is the skill that compounds",
        body: "The people who earn trust fastest aren't the ones with the most experience — they're the ones who follow through consistently. Do what you say, when you say it.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Ask how your work connects to the bigger picture",
        body: "Every file you maintain, every call you route, every issue you flag — it connects to something larger. Understanding that connection makes the routine work feel purposeful.",
        tone: "red" as const,
      },
    ];
  }

  // ── Before the Offer ──
  if (title.includes("before the offer")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "The recruiting workflow has strict timelines",
        body: "Drug screening has to happen within three business days of a signed offer. Reference checks need at least three contacts. These aren't suggestions — they're requirements that protect the company.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Non-Negotiable",
        title: "There are questions you cannot ask in an interview",
        body: "Age, marital status, religion, disability, pregnancy — protected classes are off-limits. Not 'probably shouldn't ask.' Cannot ask. Know the list and stick to job-related criteria.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Memphis and Scottsboro have different workflows",
        body: "Employvio processes differ by location — drug screen panels, background check steps, and even some forms vary. Always verify which location's process you're following.",
        tone: "red" as const,
      },
    ];
  }

  // ── After the Offer ──
  if (title.includes("after the offer")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "BambooHR setup is a 12-step process — don't skip steps",
        body: "The HRA-04 workflow has a specific order for a reason. Employee numbers, tax forms, document folders — each step builds on the last. Skipping ahead creates problems you'll have to fix later.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "State tax forms aren't automatic for every state",
        body: "Tennessee and Alabama are pre-loaded, but if a new hire is in any other state, you'll need to manually add the correct tax form. Miss this and payroll gets complicated fast.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Documents go in specific folders — every time",
        body: "New Hire Forms, Medical, Payroll, I-9 — each document type has a designated folder in BambooHR. Filing things in the wrong place isn't a small mistake when someone needs to find them later.",
        tone: "red" as const,
      },
    ];
  }

  // ── Key People & Quick Answers (Quick References) ──
  if (title.includes("quick") || title.includes("key people")) {
    return [
      {
        eyebrow: "Bookmark This",
        title: "This is the page you'll come back to most",
        body: "Key contacts, system URLs, the attendance point breakdown, SOP numbers — it's all here in one place. Don't try to memorize it. Just know where to find it.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "File naming follows a standard: YYYY-MM-DD",
        body: "Every document you save should start with the date in that format. It keeps everything sortable and findable. Small habit, big impact over time.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Heads Up",
        title: "The attendance thresholds are specific numbers",
        body: "5.0 points triggers the first corrective step, and it escalates from there. Understanding the point values for different situations — tardy, absence, no-call — helps you answer questions confidently.",
        tone: "red" as const,
      },
    ];
  }

  // ── Your First 30 Days — HR ──
  if (title.includes("first") && title.includes("days") && title.includes("hr")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Days 1–30 are about learning, not performing",
        body: "You're expected to listen, shadow, ask questions, and get comfortable with systems. Nobody expects you to run payroll solo in week two. Give yourself permission to be new.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "By day 60, you should need zero reminders",
        body: "The ramp is real: learn in month one, operate independently in month two, start improving things in month three. That's the trajectory — steady and intentional.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Build relationships early — they pay off later",
        body: "Get to know your key stakeholders in the first few weeks. When you eventually need a fast answer, a favor, or context on a tricky situation, those early connections make everything smoother.",
        tone: "red" as const,
      },
    ];
  }

  // ── Your First 30 Days — Warehouse ──
  if (title.includes("first") && title.includes("days") && title.includes("warehouse")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Your first week is for learning, not proving yourself",
        body: "Watch, listen, ask questions, and expect to make mistakes. That's the job right now. Nobody on the floor expects you to be fast yet — they expect you to be safe and coachable.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Know who's who on the floor",
        body: "Your supervisor, your trainer, the HR contact, and the IT lane — those are the four people you need to know by name in week one. Each one helps you in a different way.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Good habits beat good intentions",
        body: "Show up ready, scan everything, keep your area clean, escalate early, ask before assuming. These six things will carry you further than talent alone. Start them now so they're automatic later.",
        tone: "red" as const,
      },
    ];
  }

  // ── Your First 30 Days — Administrative ──
  if (title.includes("first") && title.includes("days") && title.includes("administrative")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Week one is orientation — not full speed",
        body: "You'll spend the first week learning file systems, meeting key contacts, and understanding confidentiality expectations. That's enough. Don't try to prove anything yet.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Accuracy before speed — always",
        body: "In weeks two and three, you'll start handling core workflows with guidance. The goal isn't to go fast, it's to go right. Speed comes naturally once the process is solid.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Your 30-day check-in is a conversation, not a test",
        body: "Come prepared with what's going well, where you have gaps, and what support you need. Honest self-assessment at this stage earns more respect than pretending everything is perfect.",
        tone: "red" as const,
      },
    ];
  }

  // ── Quality & Accuracy — Warehouse ──
  if (title.includes("quality") || title.includes("accuracy")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Most errors come from the same few habits",
        body: "Misread label, skipped scan, wrong location, assumed quantity. These are the common ones. They're not complicated to fix — they just require you to slow down at the right moments.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "When something looks wrong, stop",
        body: "Don't keep going and hope it works out. Stop, verify, and escalate if needed. Catching a problem early is always cheaper than fixing it after it ships.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Your suggestions actually matter here",
        body: "If you see a better way to do something on the floor, bring it to your supervisor. Continuous improvement isn't just a buzzword — it's how the warehouse actually gets better.",
        tone: "red" as const,
      },
    ];
  }

  // ── Safety & OSHA — Warehouse ──
  if (title.includes("osha") || (title.includes("safety") && title.includes("warehouse"))) {
    return [
      {
        eyebrow: "Non-Negotiable",
        title: "PPE requirements are location-specific",
        body: "Closed-toe, closed-heel shoes are the minimum everywhere. Beyond that, your area may require additional gear. Know what applies to your zone before your first shift on the floor.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Heads Up",
        title: "Injuries get reported immediately — not at shift end",
        body: "Tell your supervisor right away, even if it seems minor. Waiting until later creates documentation problems and can delay the help you need. Immediate means immediate.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Safe lifting isn't just advice — it's how you avoid getting hurt",
        body: "Bend at the knees, keep the load close, don't twist. You'll hear it a lot because back injuries are the most common and the most preventable. Take it seriously from day one.",
        tone: "red" as const,
      },
    ];
  }

  // ── Recruitment Process (management) ──
  if (title.includes("recruit")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Every hire starts with a submitted requisition",
        body: "Before you start interviewing, the JotForm requisition needs to be submitted and approved. Whether it's a new position or a backfill, the process starts the same way.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Screening should be structured and job-related",
        body: "Use BambooHR's STAR ratings, stick to job-related criteria, and make sure each panel member rates independently. Structured hiring isn't just fair — it's legally defensible.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "The offer process has a specific sequence",
        body: "Verbal offer first, then written. Don't skip steps or freelance the terms. Consistency in the offer process protects both the candidate and the company.",
        tone: "red" as const,
      },
    ];
  }

  // ── New Hire Onboarding (management — "hiring-onboarding") ──
  if (title.includes("new hire") || title.includes("onboarding")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "The position request comes before everything else",
        body: "Before onboarding can start, the BambooHR Position Request has to be complete. Pre-boarding decisions — company phone, credit card, hardware, vehicle — all flow from this step.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "IT coordination is triggered automatically — but verify",
        body: "Once the request goes through, IT gets notified for equipment and access setup. But 'triggered' doesn't mean 'done.' Follow up to make sure the new hire's first day goes smoothly.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "A smooth first day starts with your prep work",
        body: "Keys, badges, workstation, parking — the details that seem small are the ones new hires remember most. A new employee who shows up to a prepared workspace feels expected. That matters.",
        tone: "red" as const,
      },
    ];
  }

  // ── Employee Changes (management) ──
  if (title.includes("employee changes")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Every change goes through BambooHR — no exceptions",
        body: "Compensation, title, department, reporting manager, employment status — all changes must be submitted as a change request. Verbal agreements or side-channel updates don't count.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Critical",
        title: "Tuesday at 4:30 PM is the payroll cutoff",
        body: "If a compensation or status change misses the cutoff, it won't hit the current pay cycle. Plan ahead and submit early — corrections after the fact are messy for everyone.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Documentation completeness prevents delays",
        body: "Every required field needs to be filled. Job descriptions need to be attached for title changes. Incomplete submissions get sent back, and the employee feels the delay. Get it right the first time.",
        tone: "red" as const,
      },
    ];
  }

  // ── Terminations & Offboarding (management) ──
  if (title.includes("termination")) {
    return [
      {
        eyebrow: "Non-Negotiable",
        title: "HR approval is required before any termination",
        body: "No manager can terminate an employee without HR sign-off. The documentation — coaching records, corrective actions, attendance history, performance notes — needs to be in place first.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Heads Up",
        title: "Involuntary terminations mean same-day access removal",
        body: "When someone is involuntarily terminated, system access, building access, and equipment are handled immediately. The BambooHR Offboarding Request tab triggers the IT service ticket automatically.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Scheduled offboarding gives you time to plan",
        body: "For voluntary separations with a known last day, you can coordinate access removal, equipment return, and knowledge transfer in advance. Use that time — a rushed exit creates loose ends.",
        tone: "red" as const,
      },
    ];
  }

  // ── Performance Management (management) ──
  if (title.includes("performance management")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "BambooHR has more performance tools than most people realize",
        body: "Manager assessments, self-assessments, peer assessments, goals, and 1:1 meeting notes — they're all built in. Using them consistently creates a paper trail that makes review time painless.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Fair ratings require calibration, not gut feelings",
        body: "Avoid recency bias, halo effects, and grade inflation. Rate against the criteria, not against other employees or your personal relationship. Consistency across your team is what makes reviews credible.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "1:1s are where the real work happens",
        body: "The annual review shouldn't contain surprises. Regular 1:1s give you the space to coach, course-correct, and celebrate wins in real time. If you're only giving feedback once a year, it's too late.",
        tone: "red" as const,
      },
    ];
  }

  // ── Coaching & Corrective Action (management) ──
  if (title.includes("coaching") || title.includes("corrective")) {
    return [
      {
        eyebrow: "Heads Up",
        title: "Coaching and corrective action are two different tools",
        body: "Coaching is proactive — it helps someone improve before there's a formal problem. Corrective action is reactive — it documents a pattern that needs to change. Know which one you're reaching for and why.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Non-Negotiable",
        title: "The escalation path is specific and must be followed",
        body: "Verbal warning, written action, PIP, final warning, termination. You can't skip steps to speed things up. Each step exists to give the employee a fair chance and to protect the company legally.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Documentation is what makes this defensible",
        body: "Every coaching conversation, every corrective step, every outcome — document it. If it ever goes to an EEOC claim or legal review, your notes are the only thing that proves you handled it fairly.",
        tone: "red" as const,
      },
    ];
  }

  // ── Fallback (should rarely be hit now) ──
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
  const { data: module, isLoading, error } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);
  const { data: moduleCatalog } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  // Coach tip hooks must be before early returns to satisfy React's rules of hooks
  const moduleTitle = module?.title ?? "";
  const earlyTipPool = coachTipsForModule(moduleTitle, module?.requires_quiz ?? false, module?.requires_acknowledgement ?? false);
  const [coachTip, setCoachTip] = useState(earlyTipPool[0] ?? "");
  useEffect(() => { setCoachTip(pickRandom(earlyTipPool)); }, [slug, moduleTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reading progress bar — tracks scroll position as 0–100
  const [readingProgress, setReadingProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        setReadingProgress(scrollHeight > 0 ? Math.min(Math.round((scrollTop / scrollHeight) * 100), 100) : 0);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); };
  }, []);

  // Track which sections the user has scrolled past (for TOC checkmarks)
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  useEffect(() => {
    setReadSections(new Set()); // reset on module change
  }, [slug]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Mark section as read when its bottom edge passes above the viewport center
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            setReadSections((prev) => {
              if (prev.has(entry.target.id)) return prev;
              const next = new Set(prev);
              next.add(entry.target.id);
              return next;
            });
          }
        });
      },
      { rootMargin: "0px 0px -50% 0px" }
    );
    // Observe all section elements with IDs matching our display sections
    const sectionEls = document.querySelectorAll("section[id], div[id].scroll-mt-24");
    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slug, module]); // eslint-disable-line react-hooks/exhaustive-deps

  // Human notes card stack — user clicks through one at a time
  const [humanNoteIndex, setHumanNoteIndex] = useState(0);
  useEffect(() => { setHumanNoteIndex(0); }, [slug]);

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

  type Section = { id: string; title?: string; blocks: ModuleContentBlock[]; noStep?: boolean };
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

  // Mark sections that contain subheadings as non-step guidance sections
  output.forEach((section) => {
    if (section.blocks.some((b) => b.type === "subheading")) {
      section.noStep = true;
    }
  });

  const sections = output.filter((section) => section.title || section.blocks.length > 0);

  // Build a map from section array index to step number, skipping noStep sections
  const stepNumberMap: Record<number, number> = {};
  let stepCounter = 0;
  sections.forEach((section, i) => {
    if (section.noStep) {
      stepNumberMap[i] = -1; // not a step
    } else {
      stepNumberMap[i] = stepCounter;
      stepCounter++;
    }
  });

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

  // Gut Check scenarios for Where To Go (Support, Leave & Resources)
  const whereToGoGutChecks = (currentModule.title.toLowerCase().includes("where to go") || currentModule.slug === "support-leave-resources") ? [
    {
      scenario: "A coworker mentions they need surgery next month and asks you what they should do about time off. What's the best advice?",
      options: [
        { id: "a", text: "Tell them to submit a PTO request in BambooHR" },
        { id: "b", text: "Suggest they talk to their supervisor first, and if it involves medical leave, go directly to HR" },
        { id: "c", text: "Let them know they'll need to use vacation time" },
        { id: "d", text: "Tell them to call the EAP" },
      ],
      correctId: "b",
      explanation: "A surgery likely involves medical leave, which has its own rules and protections. Their supervisor is a good starting point, but HR needs to be involved early for anything medical or leave-related.",
    },
    {
      scenario: "You're going through a stressful time at home and it's starting to affect your focus at work. What resource is available to you right now?",
      options: [
        { id: "a", text: "Submit a PTO request and take time off" },
        { id: "b", text: "Wait until your 60-day benefits kick in" },
        { id: "c", text: "The Employee Assistance Program — it's free, confidential, and available from day one" },
        { id: "d", text: "Ask your supervisor for a schedule change" },
      ],
      correctId: "c",
      explanation: "The EAP is available from day one to you and your household — no waiting period, no enrollment. It covers counseling, financial guidance, legal support, and more. Everything is confidential.",
    },
    {
      scenario: "You have a concern about something happening at work, but you're not comfortable bringing it to your supervisor. What should you do?",
      options: [
        { id: "a", text: "Wait and see if it resolves itself" },
        { id: "b", text: "Bring it up at your next performance review" },
        { id: "c", text: "Go directly to HR — you don't need permission to skip a step" },
        { id: "d", text: "Ask a coworker to bring it up for you" },
      ],
      correctId: "c",
      explanation: "You never need permission to skip a step when the situation calls for it. If you're not comfortable going to your supervisor, go directly to HR. That's exactly what they're there for.",
    },
  ] : [];

  // Override first section for How We Show Up (both all and HR versions)
  if (currentModule.title.toLowerCase().includes("how we show up")) {
    const coverSection = sections.find(
      (s) => s.title?.toLowerCase().includes("what this module covers") || s.title?.toLowerCase().includes("welcome to aap")
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

  function handleFinished() {
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
            {railSections.map((section) => {
              const isRead = readSections.has(section.id);
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex items-start gap-2 rounded-[9px] px-2 py-1.5 text-[0.75rem] transition-all duration-200 hover:bg-[rgba(14,165,233,0.1)] hover:text-[#0784c4]"
                  style={{ color: isRead ? "#0ea5d9" : "#274566" }}
                >
                  {isRead ? (
                    <svg className="mt-[3px] h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="#0ea5d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "opacity 300ms ease", opacity: 1 }}>
                      <path d="M2.5 6.5 5 9l4.5-6" />
                    </svg>
                  ) : (
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#17365d] transition-colors group-hover:bg-[#df0030]" />
                  )}
                  <span className={cn("leading-[1.3]", isRead ? "font-semibold" : "font-semibold")}>{section.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderSection = (
    section: Section,
    sectionIndex: number,
    style: "featured" | "open"
  ) => {
    const isFeatured = style === "featured";
    const isTimeline = isManagement && !isFeatured;
    const isGuidanceSection = !!(section as Section).noStep;

    const heading = isTimeline && !isGuidanceSection ? (
      // Timeline heading: eyebrow + clean heading (no cyan bar)
      <div className="mb-5">
        <p className="mgmt-step-eyebrow">Step {stepNumberMap[sectionIndex] ?? sectionIndex}</p>
        <h2 className="mgmt-step-heading">
          {section.title ? stripSectionNumber(section.title.replace(/\?$/, "")) : "Overview"}
        </h2>
      </div>
    ) : (
      // Standard heading with cyan gradient bar (also used for guidance sections)
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

        {isGuidanceSection ? (
          <GuidanceAccordion blocks={section.blocks} sectionId={section.id} variant={isManagement ? "resource" : "training"} />
        ) : (
        <div className="space-y-0">
          {(() => {
            // Group consecutive download/link blocks into grid rows
            const groups: { type: "single"; block: ModuleContentBlock; index: number }[] | { type: "grid"; blocks: { block: ModuleContentBlock; index: number }[] }[] = [];
            const result: ({ type: "single"; block: ModuleContentBlock; index: number } | { type: "grid"; blocks: { block: ModuleContentBlock; index: number }[] })[] = [];
            let pendingDownloads: { block: ModuleContentBlock; index: number }[] = [];

            const flushDownloads = () => {
              if (pendingDownloads.length >= 2) {
                result.push({ type: "grid", blocks: [...pendingDownloads] });
              } else if (pendingDownloads.length === 1) {
                result.push({ type: "single", block: pendingDownloads[0].block, index: pendingDownloads[0].index });
              }
              pendingDownloads = [];
            };

            section.blocks.forEach((block, blockIndex) => {
              if (block.type === "download" || block.type === "link") {
                pendingDownloads.push({ block, index: blockIndex });
              } else {
                flushDownloads();
                result.push({ type: "single", block, index: blockIndex });
              }
            });
            flushDownloads();

            return result.map((group, groupIndex) => {
              if (group.type === "grid") {
                return (
                  <div key={`${section.id}-grid-${groupIndex}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(groupIndex, 8) * 25}ms` }}>
                    {groupIndex > 0 ? (
                      <div className={cn("mb-6 h-px w-full", isFeatured ? "bg-[linear-gradient(90deg,rgba(14,127,179,0.22)_0%,rgba(14,127,179,0.08)_40%,rgba(14,127,179,0)_100%)]" : "bg-[linear-gradient(90deg,rgba(27,44,86,0.18)_0%,rgba(27,44,86,0.05)_36%,rgba(27,44,86,0)_100%)]")} />
                    ) : null}
                    <div className={cn("grid gap-3", group.blocks.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3")}>
                      {group.blocks.map((item) => (
                        <ContentBlock key={`${section.id}-${item.index}`} block={item.block} emphasizeLead={false} variant={isManagement ? "resource" : "training"} gridItem />
                      ))}
                    </div>
                  </div>
                );
              }
              const { block, index: blockIndex } = group;
              return (
                <div key={`${section.id}-${blockIndex}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(groupIndex, 8) * 25}ms` }}>
                  {groupIndex > 0 ? (
                    <div className={cn("mb-6 h-px w-full", isFeatured ? "bg-[linear-gradient(90deg,rgba(14,127,179,0.22)_0%,rgba(14,127,179,0.08)_40%,rgba(14,127,179,0)_100%)]" : "bg-[linear-gradient(90deg,rgba(27,44,86,0.18)_0%,rgba(27,44,86,0.05)_36%,rgba(27,44,86,0)_100%)]")} />
                  ) : null}
                  <ContentBlock block={block} emphasizeLead={block.type === "text" && blockIndex === 0} variant={isManagement ? "resource" : "training"} />
                </div>
              );
            });
          })()}
        </div>
        )}
        {!isManagement && isFeatured && howWorkWorksGutChecks.length > 0 && (
          <div className="mt-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <GutCheckBlock scenarios={howWorkWorksGutChecks} />
          </div>
        )}
        {/* Benefits gut check rendered at page bottom, not here */}
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
      if (isGuidanceSection) {
        // Guidance section: no step marker, just content
        return (
          <section key={section.id} id={section.id} className="mgmt-timeline-section scroll-mt-24">
            <div className="mgmt-timeline-content" style={{ paddingLeft: "3.5rem" }}>
              {content}
            </div>
          </section>
        );
      }
      return (
        <section key={section.id} id={section.id} className="mgmt-timeline-section scroll-mt-24">
          <div className="mgmt-timeline-row">
            <div className="mgmt-timeline-marker">
              <span className="mgmt-step-number">{stepNumberMap[sectionIndex] ?? sectionIndex}</span>
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
      {/* Reading progress bar */}
      {!isManagement && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-50 h-[3px]"
          style={{
            width: `${readingProgress}%`,
            background: "linear-gradient(90deg, #0f7fb3 0%, #06b6d4 52%, #df0030 100%)",
            transition: "width 150ms ease-out",
            opacity: readingProgress > 0 && readingProgress < 100 ? 1 : 0,
          }}
        />
      )}

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

        {!isManagement && humanMoments.length > 0 && (
        <section
          className="relative overflow-hidden"
          style={{
            padding: "2rem 2.5rem 2.25rem",
            background: "rgba(10, 22, 40, 0.04)",
            borderTop: "0.5px solid rgba(10, 22, 40, 0.08)",
            borderBottom: "0.5px solid rgba(10, 22, 40, 0.08)",
          }}
        >
          <style>{`
            @keyframes hn-slide-in {
              0% { opacity: 0; transform: translateX(24px); }
              100% { opacity: 1; transform: translateX(0); }
            }
            @keyframes hn-slide-out {
              0% { opacity: 1; transform: translateX(0); }
              100% { opacity: 0; transform: translateX(-24px); }
            }
          `}</style>
          <div
            className="pointer-events-none absolute -right-16 -top-8 h-36 w-36 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(15,127,179,0.10) 0%, rgba(15,127,179,0) 72%)" }}
          />
          <div
            className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(223,0,48,0.07) 0%, rgba(223,0,48,0) 72%)" }}
          />

          {/* Header row */}
          <div className="relative mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[rgba(27,44,86,0.06)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#17365d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
                Human Notes
              </p>
              <h2 className="mt-3 text-[1.42rem] font-medium tracking-[-0.03em] text-[#0d1f3a]">
                The part new hires usually want someone to just say out loud
              </h2>
            </div>
            {/* Card counter */}
            <span className="mt-1 shrink-0 text-[0.7rem] font-semibold tabular-nums text-[#6a82a2]">
              {humanNoteIndex + 1} / {humanMoments.length}
            </span>
          </div>

          {/* Card stack */}
          <div className="relative" style={{ minHeight: "160px" }}>
            {/* Background "stacked" cards */}
            {humanMoments.length > 2 && humanNoteIndex < humanMoments.length - 2 && (
              <div
                className="absolute inset-x-0 top-0 rounded-[16px] border border-[rgba(27,44,86,0.08)] bg-white/40"
                style={{ transform: "translateY(8px) scale(0.94)", height: "calc(100% - 4px)", zIndex: 0 }}
              />
            )}
            {humanMoments.length > 1 && humanNoteIndex < humanMoments.length - 1 && (
              <div
                className="absolute inset-x-0 top-0 rounded-[16px] border border-[rgba(27,44,86,0.10)] bg-white/60"
                style={{ transform: "translateY(4px) scale(0.97)", height: "calc(100% - 2px)", zIndex: 1 }}
              />
            )}

            {/* Active card */}
            <div
              key={humanNoteIndex}
              className="relative rounded-[16px] border border-[rgba(27,44,86,0.14)] bg-white px-6 py-5 shadow-[0_4px_16px_rgba(12,24,47,0.08)]"
              style={{ zIndex: 2, animation: "hn-slide-in 280ms ease-out both" }}
            >
              <p
                className="text-[0.62rem] font-bold uppercase tracking-[0.12em]"
                style={{
                  color:
                    humanMoments[humanNoteIndex].tone === "navy" ? "#17365d"
                      : humanMoments[humanNoteIndex].tone === "cyan" ? "#0d5f91"
                      : "#b3234c",
                }}
              >
                {humanMoments[humanNoteIndex].eyebrow}
              </p>
              <h3 className="mt-2.5 text-[1.08rem] font-bold leading-[1.28] tracking-[-0.02em] text-[#112744]">
                {humanMoments[humanNoteIndex].title}
              </h3>
              <p className="mt-2.5 text-[0.84rem] leading-[1.65] text-[#425d7d]">
                {humanMoments[humanNoteIndex].body}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="relative mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setHumanNoteIndex((i) => Math.max(0, i - 1))}
              disabled={humanNoteIndex === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(27,44,86,0.12)] bg-white text-[#17365d] transition-all duration-150 hover:border-[rgba(27,44,86,0.24)] hover:shadow-[0_2px_8px_rgba(12,24,47,0.1)] disabled:cursor-default disabled:opacity-30 disabled:hover:border-[rgba(27,44,86,0.12)] disabled:hover:shadow-none"
              aria-label="Previous note"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2L4 7l5 5" />
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {humanMoments.map((_, i) => (
                <span
                  key={i}
                  className="block rounded-full transition-all duration-200"
                  style={{
                    width: i === humanNoteIndex ? "16px" : "5px",
                    height: "5px",
                    background: i === humanNoteIndex
                      ? "linear-gradient(90deg, #0f7fb3, #22d3ee)"
                      : "rgba(27,44,86,0.18)",
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setHumanNoteIndex((i) => Math.min(humanMoments.length - 1, i + 1))}
              disabled={humanNoteIndex === humanMoments.length - 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(27,44,86,0.12)] bg-white text-[#17365d] transition-all duration-150 hover:border-[rgba(27,44,86,0.24)] hover:shadow-[0_2px_8px_rgba(12,24,47,0.1)] disabled:cursor-default disabled:opacity-30 disabled:hover:border-[rgba(27,44,86,0.12)] disabled:hover:shadow-none"
              aria-label="Next note"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 2l5 5-5 5" />
              </svg>
            </button>
          </div>
        </section>
        )}

        {/* Render sections before last, then Benefits gut check, then last section (Need Help) */}
        {displaySections.length > 2
          ? displaySections.slice(1, -1).map((section, index) => renderSection(section, index + 1, "open"))
          : null}
        {!isManagement && benefitsGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={benefitsGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && whereToGoGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={whereToGoGutChecks} />
            </ModulePanel>
          </div>
        )}
        {displaySections.length > 1
          ? renderSection(displaySections[displaySections.length - 1], displaySections.length - 1, "open")
          : null}

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
          <Button onClick={handleFinished} className="h-[2.8rem] px-6 text-[0.88rem]">
            Finished!
          </Button>
        </div>
        )}
      </div>
    </ModuleShell>
    </>
  );
}

