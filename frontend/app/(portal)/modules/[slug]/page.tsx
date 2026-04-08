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
import { NoteWidget } from "@/components/features/notes/NoteWidget";
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
      "Your role changes depending on whether someone quits or gets let go. Read both sections carefully — the boundaries matter.",
      "System cleanup is two steps, same day, every time: BambooHR and IT notification. Build the habit now.",
      "Employees will ask about PTO payouts before, during, and after separation. Know the answer cold so you don't have to look it up.",
      "If someone approaches you about a termination before Nicole has talked to them, redirect — don't confirm, deny, or discuss.",
    ];
  }

  if (title.includes("quick reference") || title.includes("key people")) {
    return [
      "This page is your desk reference. Bookmark it, print it, whatever works — just keep it within reach.",
      "The SOP index tells you exactly which document to open for any task. Use it instead of guessing.",
      "Key contacts prefer Teams for most things. Save the phone calls for urgent escalations.",
    ];
  }

  if (title.includes("first 30") || title.includes("first 90") || title.includes("first day") || title.includes("what's ahead") || title.includes("whats ahead")) {
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

function buildHumanMoments(moduleTitle: string, hasQuiz: boolean, hasAcknowledgement: boolean, track?: string, slug?: string) {
  const title = moduleTitle.toLowerCase();

  if (title.includes("how work works")) {
    if (track === "hr") {
      return [
        {
          eyebrow: "Heads Up",
          title: "You're on both sides of these policies",
          body: "As an AAP employee, these rules apply to you. As the HR Administrative Assistant, you're also the person tracking points, pulling records, and answering questions about them. Know the policies well enough to explain them — and well enough to follow them yourself.",
          tone: "navy" as const,
        },
        {
          eyebrow: "Non-Negotiable",
          title: "Accuracy isn't optional when you're the one keeping the records",
          body: "Point totals, roll-off dates, corrective action thresholds — supervisors and employees both rely on what you have documented. A wrong number can delay a corrective conversation or give someone bad information about where they stand. Double-check before you hand anything off.",
          tone: "cyan" as const,
        },
        {
          eyebrow: "Real Talk",
          title: "You won't always have the answer — and that's the job working correctly",
          body: "FMLA questions, payroll disputes, gray-area situations — those go to Nicole. The fastest way to build trust in this role isn't knowing everything, it's knowing exactly when to stop and route it to the right person.",
          tone: "red" as const,
        },
      ];
    }
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
    if (track === "hr") {
      return [
        {
          eyebrow: "In The Loop",
          title: "You'll live in BambooHR and Paylocity — learn them now",
          body: "These two systems are where PTO balances, pay stubs, benefit elections, and attendance records live. Employees will ask you to look things up, walk them through screens, and fix what looks wrong. The faster you learn to navigate both, the fewer times you'll need to ask for help.",
          tone: "navy" as const,
        },
        {
          eyebrow: "Heads Up",
          title: "Enrollment deadlines are the #1 thing employees miss",
          body: "When someone misses their benefits enrollment window, there's almost nothing you can do to fix it. Know the timeline cold so you can remind employees early — and flag it to Nicole if someone's window is about to close.",
          tone: "cyan" as const,
        },
        {
          eyebrow: "Real Talk",
          title: "You're the first person they'll ask — not the last",
          body: "Before an employee calls Paylocity support or emails Nicole, they'll stop at your desk. Most of the time it's a simple question — PTO balance, enrollment status, where to find a form. Having quick, accurate answers builds the kind of trust that makes everything else in HR easier.",
          tone: "red" as const,
        },
      ];
    }
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

  if ((title.includes("welcome") || title.includes("aap")) && !title.includes("safety")) {
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
    if (track === "hr") {
      return [
        {
          eyebrow: "Heads Up",
          title: "You'll hear things you can't repeat",
          body: "Medical situations, leave reasons, accommodation details — employees will share sensitive information because they trust HR. That trust is protected by HIPAA and federal employment law. What you hear stays between you, Nicole, and the file. No exceptions.",
          tone: "navy" as const,
        },
        {
          eyebrow: "Non-Negotiable",
          title: "Route it — don't resolve it",
          body: "FMLA, ADA accommodations, medical leave — these have legal requirements that go beyond paperwork. Your job is to listen, document what you can, and get it to Nicole. Do not advise, interpret eligibility, or make promises about what's covered.",
          tone: "cyan" as const,
        },
        {
          eyebrow: "Real Talk",
          title: "The EAP is a tool you should know cold",
          body: "Employees won't always tell you what's really going on — they'll just seem stressed, frustrated, or checked out. Knowing how to mention the EAP without overstepping is one of the most useful things you can do in this role. It's free, it's confidential, and it's available from day one.",
          tone: "red" as const,
        },
      ];
    }
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
    if (track === "warehouse") {
      return [
        {
          eyebrow: "Non-Negotiable",
          title: "Closed-toe shoes aren't a suggestion",
          body: "Steel-toed or closed-toe, closed-heel footwear is required every time you step on the warehouse floor. No exceptions, no 'just for a minute.' The same goes for any PPE your area requires — if you're not sure what's needed, ask your supervisor before you start.",
          tone: "navy" as const,
        },
        {
          eyebrow: "Heads Up",
          title: "Report it. Every time. Even the small stuff.",
          body: "That bruise from bumping into a shelf. The near-miss with a pallet jack. The wet spot nobody cleaned up yet. Report it anyway. Small things become big things when they go undocumented — and the safety team tracks near-misses specifically to fix hazards before someone actually gets hurt.",
          tone: "cyan" as const,
        },
        {
          eyebrow: "Real Talk",
          title: "If it feels unsafe, stop.",
          body: "You are never expected to push through a task that doesn't feel right. If something seems off — a load that's too heavy, equipment that's acting up, a process that skips a step — stop what you're doing and escalate before continuing. That's not slowing things down, that's doing your job.",
          tone: "red" as const,
        },
      ];
    }
    if (track === "administrative") {
      return [
        {
          eyebrow: "Heads Up",
          title: "Your workspace has hazards too",
          body: "Slips, trips, and ergonomics aren't just warehouse concerns. Spilled coffee, a cord across the walkway, or 8 hours of bad posture add up. If you see something, fix it or report it.",
          tone: "navy" as const,
        },
        {
          eyebrow: "Non-Negotiable",
          title: "Report it. Even if it seems minor.",
          body: "A headache from a strange smell, a bruise from a file cabinet, a near-miss on a wet floor. Report it anyway. Small things become big things when they go undocumented.",
          tone: "cyan" as const,
        },
        {
          eyebrow: "Good To Know",
          title: "See something? Say something.",
          body: "An unfamiliar visitor, a propped-open door, a coworker who seems off — trust your instincts and speak up. Your supervisor or HR would rather hear about a false alarm than miss a real one.",
          tone: "red" as const,
        },
      ];
    }
    if (track === "hr") {
      return [
        {
          eyebrow: "Heads Up",
          title: "You'll field these questions, not just follow the rules",
          body: "As HR, you're the person people come to when they're unsure about safety reporting, injury procedures, or who to call. Know this module well enough to guide others through it.",
          tone: "navy" as const,
        },
        {
          eyebrow: "Non-Negotiable",
          title: "Delayed reporting creates real problems",
          body: "When an employee reports an injury late — or not at all — it complicates everything from workers' comp to OSHA documentation. Reinforce the 'report it now' message every chance you get.",
          tone: "cyan" as const,
        },
        {
          eyebrow: "Real Talk",
          title: "Safety culture starts with how you respond",
          body: "If someone reports a near-miss and gets brushed off, they won't report the next one. How you receive safety concerns sets the tone for whether people speak up or stay quiet.",
          tone: "red" as const,
        },
      ];
    }
    return [
      {
        eyebrow: "Heads Up",
        title: "Safety applies to every role",
        body: "Slips, trips, and falls are the #1 cause of office injuries. Spilled coffee, a box in the walkway, a cord across the floor — it doesn't take heavy machinery to get hurt. If you see it, fix it or report it.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Non-Negotiable",
        title: "Report It. Every Time.",
        body: "That 'minor' paper cut from a box cutter. The bruise from bumping into a shelf. The headache from a strange smell in the break room. Report it anyway. Small things become big things when they go undocumented — and delayed reporting makes everything harder for you and for AAP.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "See Something? Say Something.",
        body: "You don't have to be a safety expert to recognize when something isn't right. An unfamiliar visitor, a propped-open door, a coworker who seems off — trust your instincts and speak up. Your supervisor or HR would rather hear about a false alarm than miss a real one.",
        tone: "red" as const,
      },
    ];
  }

  // ── Your Toolkit (general) ──
  if (title === "your toolkit" && track !== "hr") {
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
  if (title.includes("your toolkit") && track === "hr") {
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
        eyebrow: "Non-Negotiable",
        title: "Terminations come from Nicole — never you",
        body: "Involuntary separations are communicated by the HR Manager only. You don't hint, you don't confirm, you don't prep the employee. Your role is support, documentation, and system cleanup after the conversation happens.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Heads Up",
        title: "System cleanup happens the same day — no exceptions",
        body: "BambooHR and IT notification. Two steps, same day, every time. An ex-employee with overnight access to company systems is a security gap you don't want to explain.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Know the PTO payout rules cold",
        body: "Vacation is paid out. Personal leave is forfeited. Sick leave is relinquished. Employees will ask — and they'll ask you before they ask anyone else. Have the answer ready, not a guess.",
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

  // ── Final Review — no Human Notes ──
  if (title.includes("final review")) {
    return [];
  }

  // ── Where You Make an Impact — HR ──
  if (title.includes("impact") && track === "hr") {
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
  if (title.includes("impact") && track === "warehouse") {
    return [
      {
        eyebrow: "Heads Up",
        title: "Accuracy matters more than speed",
        body: "You'll hear a lot about efficiency, but the warehouse runs on getting things right. A fast mistake still creates rework. Consistent accuracy is what earns trust.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "You don't need to know everything on day one",
        body: "Nobody expects you to have the whole warehouse memorized by Friday. What matters is that you ask questions, follow the process, and get a little better each shift. The people who ramp up fastest aren't the ones who already know — they're the ones who aren't afraid to say they don't.",
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
  if (title.includes("impact") && track === "administrative") {
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

  // ── What's Ahead / Your First 90 Days — HR ──
  if (slug === "your-first-90-days-hr" || ((title.includes("what's ahead") || title.includes("whats ahead") || (title.includes("first") && title.includes("days"))) && track === "hr")) {
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
  if (title.includes("first") && title.includes("days") && track === "warehouse") {
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
  if (title.includes("first") && title.includes("days") && track === "administrative") {
    return [
      {
        eyebrow: "Heads Up",
        title: "Your first month has one job: build a reliable foundation",
        body: "Learn workflows, meet the right people, ask questions before you're stuck, and show up consistently. You don't need to master everything — you just need to show you're invested.",
        tone: "navy" as const,
      },
      {
        eyebrow: "Good To Know",
        title: "Each week builds on the last",
        body: "Week one is orientation and setup. Weeks two and three are about practicing core tasks with guidance. By week four, you're working with increasing independence and prepping for your check-in.",
        tone: "cyan" as const,
      },
      {
        eyebrow: "Real Talk",
        title: "Dependable, coachable, consistent — that's the bar",
        body: "A strong first month isn't about being perfect. Come to your 30-day check-in with notes on what's going well, where you need more context, and what support would help you ramp faster.",
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
  const { data: module, isLoading, error } = useSWR(`module:${slug}:${effectiveTrack}`, () => modulesApi.get(slug, effectiveTrack) as Promise<ModuleDetail>);
  const { data: moduleCatalog } = useSWR(`modules:${effectiveTrack}`, () => modulesApi.list(effectiveTrack) as Promise<ModuleSummary[]>);
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
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="mx-auto w-full max-w-[420px] text-center">
          <h2
            className="mb-2 font-display text-[1.25rem] font-semibold tracking-tight"
            style={{ color: "#0d1f3a", letterSpacing: "-0.02em" }}
          >
            Uh-oh, this isn&apos;t supposed to happen
          </h2>
          <p className="mb-6 text-[0.92rem] leading-relaxed" style={{ color: "#5b7fa6" }}>
            Let&apos;s get you back on track.
          </p>
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-[0.88rem] font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ background: "linear-gradient(140deg, #17365d 0%, #0f7fb3 74%, #21b8e7 100%)" }}
          >
            Go to Overview
          </Link>
        </div>
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

  // Hide sections whose only content is track_blocks that don't match the current user
  const sections = output.filter((section) => {
    if (!section.title && section.blocks.length === 0) return false;
    // If every block is a track_block and none match the effective track, hide the whole section
    if (section.blocks.length > 0 && section.blocks.every((b) => b.type === "track_block")) {
      const hasVisibleBlock = section.blocks.some((b) => {
        const tracks = ((b as unknown as Record<string, unknown>).tracks as string[]) || [];
        return tracks.includes("all") || tracks.includes(effectiveTrack);
      });
      if (!hasVisibleBlock) return false;
    }
    return true;
  });

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
  const howWorkWorksGutChecks = currentModule.title.toLowerCase().includes("how work works") ? (
    effectiveTrack === "hr" ? [
      {
        scenario: "A supervisor calls and asks you how many points one of their employees has. They say they need it for a corrective action conversation this afternoon. What do you do?",
        options: [
          { id: "a", text: "Pull the record from BambooHR and send it over right away — they need it for the meeting" },
          { id: "b", text: "Pull the record, verify the point total with Nicole, and then provide it to the supervisor" },
          { id: "c", text: "Tell the supervisor they need to submit a formal request through email before you can share attendance records" },
          { id: "d", text: "Let them know attendance records are confidential and you can't share them without the employee present" },
        ],
        correctId: "b",
        explanation: "You can provide attendance records to a supervisor for corrective action purposes, but verify the total with Nicole first. A wrong number in a corrective conversation creates problems for everyone.",
      },
      {
        scenario: "An employee stops by your desk and says they need to take time off next month for surgery. They start giving you details about their diagnosis. What do you do?",
        options: [
          { id: "a", text: "Listen carefully and take notes so you have everything documented for the file" },
          { id: "b", text: "Let them share what they want to share, then let them know you'll connect them with Nicole — without writing down any medical specifics yourself" },
          { id: "c", text: "Stop them immediately and tell them they need to speak with Nicole directly — you can't hear medical information" },
          { id: "d", text: "Pull up the FMLA forms and start walking them through the initial paperwork" },
        ],
        correctId: "b",
        explanation: "You don't shut them down, but you don't document medical details either. Let them feel heard, then route it to Nicole. Starting FMLA paperwork or recording clinical details yourself creates risk.",
      },
      {
        scenario: "You're entering last week's attendance points into the point notebook and you notice one employee's total doesn't match what you expected — they seem to have fewer points than they should. What do you do?",
        options: [
          { id: "a", text: "Adjust the total to match what you think it should be based on the call-in log" },
          { id: "b", text: "Enter what the report shows and flag the discrepancy to Nicole for review" },
          { id: "c", text: "Skip that employee and come back to it after you've checked BambooHR yourself" },
          { id: "d", text: "Email the employee's supervisor to ask if they know about any approved absences you might be missing" },
        ],
        correctId: "b",
        explanation: "Enter what the report says and flag the discrepancy. Don't adjust records on your own judgment, and don't go around Nicole to resolve it. She'll sort it out.",
      },
    ] : [
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
    ]
  ) : [];

  // Gut Check scenarios for Benefits, Pay & Time Away
  const benefitsGutChecks = currentModule.title.toLowerCase().includes("benefits") ? (
    effectiveTrack === "hr" ? [
      {
        scenario: "A new hire is approaching their 60-day mark and asks you if their medical benefits will start automatically. They haven't filled out any enrollment paperwork yet. What do you do?",
        options: [
          { id: "a", text: "Let them know benefits start automatically after 60 days — they don't need to do anything" },
          { id: "b", text: "Tell them they need to enroll, explain there's a limited window, and confirm with Nicole that their enrollment materials have been sent" },
          { id: "c", text: "Pull up the enrollment forms and help them fill everything out right now" },
          { id: "d", text: "Tell them to wait for the enrollment email from HR — it'll have everything they need" },
        ],
        correctId: "b",
        explanation: "Benefits don't start automatically — employees must actively enroll during their window. Waiting for an email risks them missing it. Filling out forms yourself isn't your role. The right move is to confirm they know enrollment is required and verify with Nicole that the process is on track.",
      },
      {
        scenario: "An employee's supervisor calls you and says they want to deny a vacation request because the team is short-staffed that week. The employee has the PTO balance and submitted the request on time. What do you do?",
        options: [
          { id: "a", text: "Let the supervisor know that if the employee followed the process and has the balance, the request should be approved" },
          { id: "b", text: "Deny the request in BambooHR on behalf of the supervisor since they called you directly" },
          { id: "c", text: "Tell the supervisor it's their call and stay out of it" },
          { id: "d", text: "Let the supervisor know you'll flag it to Nicole so she can review the situation and advise" },
        ],
        correctId: "d",
        explanation: "You don't approve or deny requests, and you don't override a supervisor's decision. But you also shouldn't just stay out of it when there's a potential policy question. The right move is to route it to Nicole so she can advise the supervisor on how to handle it properly.",
      },
      {
        scenario: "An employee tells you they've been clocking in on time every day but their attendance report shows 3.5 points. They're frustrated and want you to fix it. What do you do?",
        options: [
          { id: "a", text: "Pull up their attendance record in BambooHR and correct the points that look wrong" },
          { id: "b", text: "Explain how points accumulate and roll off, then let them know you'll flag the discrepancy to Nicole for review" },
          { id: "c", text: "Tell them to take it up with their supervisor since attendance is managed at the department level" },
          { id: "d", text: "Remove the points they're disputing so they don't hit the next threshold while waiting for a review" },
        ],
        correctId: "b",
        explanation: "You don't modify attendance records yourself, and you don't dismiss the concern. Explain the system so they understand how points work, then escalate the discrepancy to Nicole for proper review. Removing points without authorization or passing it off entirely both create problems.",
      },
    ] : [
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
    ]
  ) : [];

  // Gut Check scenarios for Where To Go (Support, Leave & Resources)
  const whereToGoGutChecks = (currentModule.title.toLowerCase().includes("where to go") || currentModule.slug === "where-to-go" || currentModule.slug === "where-to-go-hr") ? (
    effectiveTrack === "hr" ? [
      {
        scenario: "An employee stops by your desk and says they need surgery next month. They start sharing medical details — diagnosis, procedure, recovery time. They seem relieved to finally tell someone. What do you do?",
        options: [
          { id: "a", text: "Listen carefully, take notes on everything they share so you have a complete record for Nicole" },
          { id: "b", text: "Let them talk, then gently let them know you'll connect them with Nicole — without writing down any medical specifics yourself" },
          { id: "c", text: "Stop them and explain that you're not the right person to hear medical details — they need to go directly to Nicole" },
          { id: "d", text: "Listen, pull up the FMLA forms, and walk them through the initial paperwork so Nicole has a head start" },
        ],
        correctId: "b",
        explanation: "You don't shut them down, but you don't document medical details either. HIPAA applies here. Let them feel heard, then route it properly. Taking clinical notes or starting FMLA paperwork yourself creates risk — that's Nicole's lane.",
      },
      {
        scenario: "A warehouse supervisor calls and says one of their employees has been missing shifts and acting erratic. They ask if HR has \"anything on file\" that might explain what's going on. What do you say?",
        options: [
          { id: "a", text: "Check BambooHR and share any relevant notes — the supervisor needs to manage their team effectively" },
          { id: "b", text: "Let them know you can't share personnel information, but offer to have Nicole follow up if there's a concern worth escalating" },
          { id: "c", text: "Tell them you're not allowed to say anything, and leave it at that" },
          { id: "d", text: "Confirm whether or not the employee has any active leave requests without going into detail" },
        ],
        correctId: "b",
        explanation: "Option A is a confidentiality breach. Option C is technically correct but unhelpful — it leaves the supervisor with nowhere to go. Option D still discloses protected information. B protects the employee while keeping the supervisor supported.",
      },
      {
        scenario: "An employee comes to you upset after a conflict with their supervisor. They say they want to \"file a complaint\" but ask you not to tell anyone — especially not their supervisor. They want it on record, just in case. What do you do?",
        options: [
          { id: "a", text: "Document what they told you and keep it between the two of you — they asked for confidentiality and you should honor that" },
          { id: "b", text: "Let them know you'll keep it as private as possible, but explain that some situations require Nicole to be involved — then bring it to her" },
          { id: "c", text: "Tell them that if they're not ready to move forward officially, there's nothing you can do yet" },
          { id: "d", text: "Encourage them to go home, cool off, and come back if they still feel the same way tomorrow" },
        ],
        correctId: "b",
        explanation: "You can't promise full confidentiality when a workplace complaint is involved — some things require action regardless of the employee's preference. But you can be honest about that while still making them feel safe. Sitting on it or dismissing it creates liability and erodes trust.",
      },
    ] : [
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
    ]
  ) : [];

  // Gut Check scenarios for How We Show Up
  const howWeShowUpGutChecks = currentModule.title.toLowerCase().includes("how we show up") ? [
    {
      scenario: "A coworker makes a joke that makes another team member visibly uncomfortable. Nobody says anything. What should you do?",
      options: [
        { id: "a", text: "It's not your problem — stay out of it" },
        { id: "b", text: "Laugh it off and move on" },
        { id: "c", text: "Check in with the person who seemed uncomfortable, and speak up or report it if needed" },
        { id: "d", text: "Wait to see if it happens again before doing anything" },
      ],
      correctId: "c",
      explanation: "You don't have to witness something twice for it to matter. Checking in with the person shows respect, and speaking up or reporting it helps keep the culture where it needs to be.",
    },
    {
      scenario: "You overhear a conversation about a customer's private account information in the break room. What's the right call?",
      options: [
        { id: "a", text: "It's just casual conversation — no big deal" },
        { id: "b", text: "Join in so you're in the loop" },
        { id: "c", text: "Politely remind them that company and customer information should stay confidential" },
        { id: "d", text: "Report them to HR immediately" },
      ],
      correctId: "c",
      explanation: "Confidential information doesn't belong in casual conversation — even in the break room. A polite reminder in the moment is usually all it takes to course-correct.",
    },
    {
      scenario: "A friend at another company asks what AAP's pricing looks like for a specific product. You know the answer. What do you do?",
      options: [
        { id: "a", text: "Share it — they're a friend, not a competitor" },
        { id: "b", text: "Give a vague answer without specifics" },
        { id: "c", text: "Let them know that's confidential and direct them to the appropriate AAP contact" },
        { id: "d", text: "Ignore the question and change the subject" },
      ],
      correctId: "c",
      explanation: "Even with good intentions, sharing company information outside of AAP can cause real damage. Redirecting them to the right contact keeps the relationship intact and the information where it belongs.",
    },
  ] : [];

  // Gut Check scenarios for Safety at AAP
  const safetyGutChecks = currentModule.title.toLowerCase().includes("safety") ? (
    effectiveTrack === "hr" ? [
      {
        scenario: "A supervisor calls to let you know an employee slipped on a wet floor near the warehouse break room. The employee says they're fine and doesn't want to make a big deal about it. What do you do?",
        options: [
          { id: "a", text: "If the employee says they're fine, there's nothing to document" },
          { id: "b", text: "Document the incident, file it in their medical folder in BambooHR, post it to the accident report groups, and let Nicole know" },
          { id: "c", text: "Tell the supervisor to keep an eye on the employee and only follow up if symptoms appear" },
        ],
        correctId: "b",
        explanation: "\"I'm fine\" doesn't close the loop. Every incident gets documented — no exceptions. File it, post it, and route it. That's the process whether the employee thinks it's a big deal or not.",
      },
      {
        scenario: "You receive an accident report from a supervisor, but the details are vague — no time of injury, no description of what happened, just \"employee hurt their back.\" What do you do?",
        options: [
          { id: "a", text: "File it as-is — at least you have something on record" },
          { id: "b", text: "Send it back to the supervisor and ask them to fill in the missing details before you file it" },
          { id: "c", text: "Fill in the gaps yourself based on what you think probably happened" },
        ],
        correctId: "b",
        explanation: "Incomplete documentation creates problems down the road. You need the basics — date, time, what happened, and how — before it goes into BambooHR. Send it back and get it right.",
      },
      {
        scenario: "A Safety Committee meeting is coming up and you realize the minutes from the last meeting were never distributed to the company president. What do you do?",
        options: [
          { id: "a", text: "Skip it — if no one's asked for them, it's probably not a priority" },
          { id: "b", text: "Get the minutes finalized and sent before the next meeting, and set a reminder so it doesn't happen again" },
          { id: "c", text: "Wait until after the upcoming meeting and send both sets at once" },
        ],
        correctId: "b",
        explanation: "Communication with the company president on safety matters is your responsibility. Don't let it slide — get it out the door and build a system so it doesn't fall through the cracks again.",
      },
      {
        scenario: "An employee forwards you a joke that was sent through company email. It's not directed at anyone specific, but it's definitely inappropriate. They want to know if it's worth reporting. What do you tell them?",
        options: [
          { id: "a", text: "It's not worth the drama — just delete it and move on" },
          { id: "b", text: "Yes — company email is for business use, and offensive content is a policy violation regardless of intent. Document it and escalate to Nicole" },
          { id: "c", text: "Only if the person who sent it has been warned before" },
        ],
        correctId: "b",
        explanation: "AAP's computer and email policy doesn't have a \"first offense\" loophole. Offensive content through company systems is a violation, period. Document it and let Nicole take it from there.",
      },
    ] : [
      {
        scenario: "You notice a small puddle near the break room from a leaky coffee maker. Nobody's slipped yet. What do you do?",
        options: [
          { id: "a", text: "Step over it — it's not that big" },
          { id: "b", text: "Clean it up or report it to your supervisor so it gets addressed" },
          { id: "c", text: "Assume someone else will take care of it" },
        ],
        correctId: "b",
        explanation: "Slips, trips, and falls are the #1 cause of office injuries. A small puddle today can be a workers' comp claim tomorrow. Fix it or flag it.",
      },
      {
        scenario: "You bump your elbow on a filing cabinet hard enough to leave a bruise, but it's not serious. Do you report it?",
        options: [
          { id: "a", text: "No — it isn't affecting my work" },
          { id: "b", text: "Only if it still hurts the next day" },
          { id: "c", text: "Yes — report it to your supervisor immediately, no matter how minor" },
        ],
        correctId: "c",
        explanation: "Every incident gets reported, even the small ones. AAP's safety team uses these reports to spot patterns and prevent future accidents.",
      },
      {
        scenario: "Someone you don't recognize is walking through the office without a badge. They look like they know where they're going. What should you do?",
        options: [
          { id: "a", text: "Nothing — they probably work here" },
          { id: "b", text: "Direct them to the reception area or notify your supervisor" },
          { id: "c", text: "Wait and see if someone else says something" },
        ],
        correctId: "b",
        explanation: "All visitors must check in at reception. It's not awkward to ask — it's your job to keep the workplace secure.",
      },
      {
        scenario: "A coworker sends a joke through the company email system that you find funny, but you think others might find offensive. Is this a problem?",
        options: [
          { id: "a", text: "It's fine — it was just a joke between friends" },
          { id: "b", text: "Yes — company email is for business use, and offensive content is prohibited regardless of intent" },
          { id: "c", text: "Only if someone complains about it" },
        ],
        correctId: "b",
        explanation: "AAP's computer and email policy is clear: company systems should never be used in ways that are disruptive or offensive to others.",
      },
    ]
  ) : [];

  // Gut Check scenarios for Your Toolkit
  const toolkitGutChecks = currentModule.title.toLowerCase() === "your toolkit" ? (
    effectiveTrack === "hr" ? [
      {
        scenario: "You're entering PTO in PayClock from the Time Off Taken Report. The report shows 8 hours of sick time, but you accidentally enter it in the vacation column. You haven't saved yet. What do you do?",
        options: [
          { id: "a", text: "Save it — PTO is PTO, the column doesn't matter" },
          { id: "b", text: "Fix it before saving — clear the vacation column and enter the hours under sick instead" },
          { id: "c", text: "Save it and make a note to fix it next pay period" },
        ],
        correctId: "b",
        explanation: "The PTO type matters. Wrong column means wrong label on the employee's pay stub — and that leads to questions and corrections you could have avoided. Fix it before you save.",
      },
      {
        scenario: "A supervisor sends you a text asking you to edit an employee's time punch from last Tuesday. No email, no correction form — just the text. What do you do?",
        options: [
          { id: "a", text: "Make the edit — a text from a supervisor counts as documentation" },
          { id: "b", text: "Ask the supervisor to send the request via email or correction form before you make any changes" },
          { id: "c", text: "Make the edit and screenshot the text as backup documentation" },
        ],
        correctId: "b",
        explanation: "Punch edits require documentation — supervisor note, email, or correction form. A text isn't it. Get it in writing before you touch anything.",
      },
      {
        scenario: "You're setting up a new Scottsboro hire in Employvio and accidentally select the Memphis drug screening workflow. You haven't submitted yet. What do you do?",
        options: [
          { id: "a", text: "Submit it — a drug test is a drug test regardless of location" },
          { id: "b", text: "Back out, start over, and select the correct Scottsboro workflow before submitting" },
          { id: "c", text: "Submit and make a note to correct it later" },
        ],
        correctId: "b",
        explanation: "Memphis and Scottsboro use different drug screening processes. Wrong workflow means wrong test, which means a delayed hire. Catch it now.",
      },
      {
        scenario: "It's been three hours since your last PayClock poll and you've been busy with other tasks. Does it matter?",
        options: [
          { id: "a", text: "Not really — polling once in the morning and once before you leave is enough" },
          { id: "b", text: "Yes — you're an hour overdue. Poll now so timecards stay current" },
          { id: "c", text: "Only if payroll is due today" },
        ],
        correctId: "b",
        explanation: "Polling every 2 hours keeps timecards current. Skipping it means incomplete data when it's time to review — and that creates more work later.",
      },
    ] : [
      {
        scenario: "You need to review your pay stub from last week. Where do you go?",
        options: [
          { id: "a", text: "BambooHR" },
          { id: "b", text: "Paylocity" },
          { id: "c", text: "Ask your supervisor to print it off" },
        ],
        correctId: "b",
        explanation: "Paylocity handles everything tied to your paycheck — pay stubs, tax forms, direct deposit, and withholding. Need a copy of your pay stub? Ask HR to print it off for you!",
      },
      {
        scenario: "You just got hired and HR says you have tasks waiting in your inbox. Where do you find them?",
        options: [
          { id: "a", text: "Your personal email" },
          { id: "b", text: "Paylocity" },
          { id: "c", text: "BambooHR inbox" },
        ],
        correctId: "c",
        explanation: "BambooHR is your HR home base. New hire tasks, forms, and documents all live in your BambooHR inbox.",
      },
      {
        scenario: "Your supervisor mentions a required training course you need to complete. Where do you find it?",
        options: [
          { id: "a", text: "Paylocity" },
          { id: "b", text: "LinkedIn Learning" },
          { id: "c", text: "BambooHR" },
        ],
        correctId: "b",
        explanation: "Supervisors can assign LinkedIn Learning trainings to help you reach your goals or catch you up on company trainings — plus thousands of optional courses you can explore on your own.",
      },
    ]
  ) : [];

  // Gut Check scenarios for Where You Make An Impact (HR)
  const impactGutChecksHR = (currentModule.slug === "where-you-make-an-impact-hr") ? [
    {
      scenario: "An employee stops you in the hallway and asks why they were written up last week. They seem upset and want details. What do you do?",
      options: [
        { id: "a", text: "Explain the corrective action process so they understand the steps" },
        { id: "b", text: "Pull up their file and review the write-up with them" },
        { id: "c", text: "Listen, document the interaction, and route them to Nicole — corrective action guidance is the HR Manager's territory" },
        { id: "d", text: "Tell them to talk to their supervisor since the supervisor initiated the write-up" },
      ],
      correctId: "c",
      explanation: "Corrective action guidance belongs to Nicole. Your job is to listen, document the conversation, and route it. Don't try to explain or interpret the write-up — that's not your lane.",
    },
    {
      scenario: "It's Tuesday at 3 PM. You're reviewing timecards and find a missing punch for an employee. You emailed their supervisor this morning but haven't heard back. What do you do?",
      options: [
        { id: "a", text: "Skip it and submit payroll without it — one missing punch won't matter" },
        { id: "b", text: "Follow up with the supervisor now and escalate to Nicole if you don't hear back before 5 PM — the 6 PM deadline doesn't wait" },
        { id: "c", text: "Enter your best guess based on the employee's usual schedule and note it for next cycle" },
        { id: "d", text: "Hold payroll submission until you get the answer, even if it means missing the deadline" },
      ],
      correctId: "b",
      explanation: "The deadline is the deadline. Follow up immediately, and if the supervisor doesn't respond, escalate to Nicole. Don't guess, don't skip it, and don't miss the deadline.",
    },
    {
      scenario: "A supervisor asks you to look into whether one of their employees has enough vacation time for a trip next month. What do you do?",
      options: [
        { id: "a", text: "Check BambooHR and give the supervisor the employee's vacation balance" },
        { id: "b", text: "Tell the supervisor to check BambooHR themselves — you're not responsible for balance inquiries" },
        { id: "c", text: "Check BambooHR, tell the employee their balance, and let them work it out with their supervisor" },
        { id: "d", text: "Route it to Nicole — PTO balances are sensitive information" },
      ],
      correctId: "a",
      explanation: "Basic PTO balance inquiries from supervisors are in your lane. Check BambooHR and give the supervisor the information they need. This isn't a pay question or a sensitive matter — it's a routine lookup.",
    },
    {
      scenario: "You're in week 3 and a new hire's onboarding paperwork hasn't been completed. You've sent two reminders. What's your next step?",
      options: [
        { id: "a", text: "Send a third reminder — persistence is part of the job" },
        { id: "b", text: "Let it go — some employees just take longer" },
        { id: "c", text: "Escalate to Nicole — you've followed up twice and the paperwork is overdue" },
        { id: "d", text: "Call the employee's supervisor and ask them to handle it" },
      ],
      correctId: "c",
      explanation: "Two follow-ups is your due diligence. After that, escalate. Onboarding paperwork that drags on too long creates compliance issues — and Nicole needs to know before it becomes a problem.",
    },
  ] : [];

  // Gut Check scenarios for Where You Make An Impact (warehouse)
  const impactGutChecks = (currentModule.slug === "where-you-make-an-impact-warehouse") ? [
    {
      scenario: "A box on your station has a slightly damaged label but the product inside looks fine. What should you do?",
      options: [
        { id: "a", text: "Ship it — the product is fine and relabeling slows things down" },
        { id: "b", text: "Set it aside and flag it so it can be relabeled correctly" },
        { id: "c", text: "Ask a coworker what they'd do" },
        { id: "d", text: "Toss it in the returns pile and move on" },
      ],
      correctId: "b",
      explanation: "A damaged label can cause real problems downstream — wrong product, wrong pharmacy, wrong patient. Flagging it is the right call every time.",
    },
    {
      scenario: "Why does following the process matter — even when a shortcut seems faster?",
      options: [
        { id: "a", text: "Because supervisors are always watching" },
        { id: "b", text: "Because every step exists for a reason and skipping one can cause problems downstream" },
        { id: "c", text: "Because shortcuts are against company policy regardless of outcome" },
        { id: "d", text: "Because the process was designed to slow things down for safety audits" },
      ],
      correctId: "b",
      explanation: "Every step in the process exists for a reason. Skipping one might save a minute now, but it can create bigger problems for pharmacies, patients, or your teammates.",
    },
    {
      scenario: "You notice a coworker skipping a check step to keep up with the pace. What's the right mindset?",
      options: [
        { id: "a", text: "It's not your business — everyone has their own workflow" },
        { id: "b", text: "Report them to a supervisor immediately" },
        { id: "c", text: "Catching mistakes before they reach pharmacies and patients is everyone's responsibility" },
        { id: "d", text: "Skip it too — if they're doing it, it's probably fine" },
      ],
      correctId: "c",
      explanation: "Quality isn't just one person's job. When you see something that could affect accuracy or safety, speaking up or flagging it is always the right move.",
    },
  ] : [];

  // Gut Check scenarios for Quality & Accuracy (warehouse)
  const qualityGutChecks = (currentModule.slug === "quality-accuracy-warehouse") ? [
    {
      scenario: "You are pulling orders and notice the product on the shelf looks similar to what the scanner is asking for, but the label does not quite match. You are close to hitting your quota for the hour. What do you do?",
      options: [
        { id: "a", text: "Scan it and see if the system accepts it — if it does, it is the right product" },
        { id: "b", text: "Pull it and make a note to mention it to your supervisor at the end of your shift" },
        { id: "c", text: "Stop, verify the label against the scanner, and flag it if it does not match" },
      ],
      correctId: "c",
      explanation: "Scanning it to \"see what happens\" might work — but if the item is similar enough to pass the scan and it is still wrong, you have just sent a bad pick downstream. And waiting until end of shift means the error has already moved on. Stop and verify in the moment.",
    },
    {
      scenario: "You scan a product and the scanner confirms it is correct. You place it in the basket and move on to the next pick. A moment later, you realize you might have grabbed the bottle next to the one you scanned. What should you do?",
      options: [
        { id: "a", text: "The scanner confirmed it, so the system would have caught a mismatch" },
        { id: "b", text: "Go back and verify that the product in the basket matches what you scanned" },
        { id: "c", text: "Keep going — if it is wrong, the packing team will catch it before it ships" },
      ],
      correctId: "b",
      explanation: "The scanner confirmed what you scanned, not what you grabbed. A mis-pull happens when the right product gets scanned but the wrong one ends up in the basket. The packing team is not checking every item against your picks — that is your responsibility.",
    },
    {
      scenario: "You realize mid-cart that you may have placed a product in the wrong basket a few picks ago. What should you do?",
      options: [
        { id: "a", text: "Finish the cart first, then go back and check before you turn it in" },
        { id: "b", text: "It was a few picks ago — if it were wrong, the scanner would have flagged something by now" },
        { id: "c", text: "Stop now, go back and check the basket, and fix it if needed" },
      ],
      correctId: "c",
      explanation: "Finishing the cart first sounds reasonable, but every pick you add on top of a potential error makes it harder to sort out. The scanner does not track which basket you physically placed items in — that is on you. Stop, check, and fix it now while you still remember which pick it was.",
    },
  ] : [];

  // Gut Check scenarios for Before the Offer (HR)
  const beforeOfferGutChecks = (currentModule.slug === "before-the-offer") ? [
    {
      scenario: "You check BambooHR and see a candidate was moved to \"Schedule Interview\" two days ago. Nobody told you about it. What do you do?",
      options: [
        { id: "a", text: "Wait for the supervisor to reach out — they may still be deciding" },
        { id: "b", text: "Call the applicant now to schedule — the status change was your trigger and you're already behind" },
        { id: "c", text: "Message the supervisor to confirm before reaching out to the candidate" },
      ],
      correctId: "b",
      explanation: "The status change is the trigger. You don't wait for a separate notification. Two days is already a delayed response — call the applicant and get it scheduled.",
    },
    {
      scenario: "During a reference check, a former employer says \"She's great — and she just got engaged, so she's in a really good place right now.\" What do you do?",
      options: [
        { id: "a", text: "Smile, say congratulations, and keep going — it's a positive comment" },
        { id: "b", text: "Note it as context but don't weight it in your evaluation" },
        { id: "c", text: "Redirect to job-related topics immediately and don't document the comment" },
      ],
      correctId: "c",
      explanation: "Marital status is a protected characteristic. It doesn't matter that it was positive or volunteered — you redirect immediately and never write it down.",
    },
    {
      scenario: "An offer letter was signed on Wednesday. It's now Monday morning and the candidate hasn't completed their drug screening. They say they'll go tomorrow. What do you do?",
      options: [
        { id: "a", text: "That's fine — tomorrow is still within the window" },
        { id: "b", text: "Let them know today is the last business day in the 3-day window and they need to go today" },
        { id: "c", text: "Escalate to Nicole — the deadline has passed" },
      ],
      correctId: "b",
      explanation: "Wednesday to Monday is 3 business days (Thursday, Friday, Monday). Today is the deadline — not tomorrow. Follow up firmly and make sure they understand the urgency.",
    },
    {
      scenario: "You've reached 2 references — both positive. You've called the remaining 4 numbers and nobody picked up. The supervisor is asking when the candidate can start. What do you do?",
      options: [
        { id: "a", text: "Two strong references is enough — move forward with the hire" },
        { id: "b", text: "Keep trying until you reach a third contact — the minimum is 3, with at least 1 employer and 1 personal" },
        { id: "c", text: "Ask the candidate for additional references since the ones provided aren't responsive" },
      ],
      correctId: "b",
      explanation: "The minimum is 3 successful contacts. Two isn't enough, no matter how positive they were. Keep calling — and if you truly can't reach a third after multiple attempts, escalate.",
    },
  ] : [];

  // Gut Check scenarios for After the Offer (HR)
  const afterOfferGutChecks = (currentModule.slug === "after-the-offer") ? [
    {
      scenario: "You're setting up a new hire in BambooHR and you're about to click Hire. You notice the \"close job posting\" checkbox is checked. The supervisor hasn't said whether the role is filled. What do you do?",
      options: [
        { id: "a", text: "Leave it checked — if they hired someone, the role is probably filled" },
        { id: "b", text: "Uncheck it — always uncheck unless you've been specifically told the role is filled" },
        { id: "c", text: "Message the supervisor to ask before proceeding" },
      ],
      correctId: "b",
      explanation: "Always uncheck. If the role is still open, closing the posting shuts off your applicant pipeline. It's easier to close a posting later than to reopen one you accidentally shut down.",
    },
    {
      scenario: "A new hire's documents are coming in. Their signed W-4 is back, and you're about to file it. You're not sure if it goes in New Hire Forms or Payroll Related Documents. What do you do?",
      options: [
        { id: "a", text: "New Hire Forms — it came in as part of the new hire packet" },
        { id: "b", text: "Payroll Related Documents — W-4s, ACH forms, and state tax forms always go here" },
        { id: "c", text: "Either folder works as long as it's in BambooHR somewhere" },
      ],
      correctId: "b",
      explanation: "Payroll Related Documents. W-4s, ACH, and state tax forms go in Payroll — not New Hire Forms. Filing in the wrong folder means someone can't find it when they need it.",
    },
    {
      scenario: "An employee who's been here for 45 days comes to you and asks when they can enroll in health insurance. What do you tell them?",
      options: [
        { id: "a", text: "They can enroll now — 45 days is close enough to the 60-day mark" },
        { id: "b", text: "Enrollment opens on the 1st of the month after they hit 60 days of employment" },
        { id: "c", text: "Route it to Nicole — benefits enrollment questions go to the HR Manager" },
      ],
      correctId: "b",
      explanation: "Health insurance enrollment opens on the 1st of the month after 60 days. You can answer this one — it's a timeline question, not a pay question. Give them the clear answer so they can plan.",
    },
    {
      scenario: "A supervisor tells you that an employee hasn't shown up or called in for two days straight. They ask what happens next. What do you say?",
      options: [
        { id: "a", text: "Try calling the employee one more time before taking any action" },
        { id: "b", text: "Two consecutive no-call/no-shows is treated as a voluntary quit — you're notifying Nicole immediately" },
        { id: "c", text: "Issue a written warning and give the employee a chance to explain" },
      ],
      correctId: "b",
      explanation: "Two consecutive no-call/no-shows is a voluntary quit under policy. No warning, no investigation. Notify Nicole immediately — she handles the separation from there.",
    },
  ] : [];

  // Gut Check scenarios for Exits & Offboarding (HR)
  const exitsGutChecks = (currentModule.slug === "exits-and-offboarding") ? [
    {
      scenario: "A supervisor stops you in the hallway and says, \"Just so you know, we're letting Marcus go on Friday. Can you get the paperwork ready?\" What do you do?",
      options: [
        { id: "a", text: "Start preparing the separation paperwork so everything is ready by Friday" },
        { id: "b", text: "Ask the supervisor if Nicole is aware and involved — involuntary terminations require HR Manager involvement before anything moves forward" },
        { id: "c", text: "Let Marcus know he should talk to Nicole before Friday" },
      ],
      correctId: "b",
      explanation: "Involuntary terminations require Nicole's involvement before the first step is taken. Your job isn't to prepare the paperwork on a supervisor's say-so — it's to make sure the right process is being followed. Loop Nicole in first, every time.",
    },
    {
      scenario: "An employee's last day is today. You updated BambooHR this morning, but it's now 4:30 PM and you realize you forgot to send the IT notification. The employee already left the building an hour ago. What do you do?",
      options: [
        { id: "a", text: "Send the IT notification first thing tomorrow morning — the employee is already gone, so there's no rush" },
        { id: "b", text: "Send the IT notification now — access removal happens the same day, even if the employee has already left" },
        { id: "c", text: "Check with Nicole first to see if it can wait until tomorrow since it's late in the day" },
      ],
      correctId: "b",
      explanation: "The employee being gone doesn't mean their access is gone. They can still log into email, systems, and network resources remotely until IT revokes it. Same-day means same-day — send that notification now.",
    },
    {
      scenario: "A departing employee catches you in the break room and asks, \"I heard I'm being terminated — is that true?\" Nicole hasn't spoken to them yet. What do you say?",
      options: [
        { id: "a", text: "Be honest — they deserve to know what's coming" },
        { id: "b", text: "Say \"I don't know anything about that\" even though you do" },
        { id: "c", text: "Say \"Let me get Nicole — she'll be able to walk you through everything\" and find Nicole immediately" },
      ],
      correctId: "c",
      explanation: "You don't confirm, deny, or discuss it. Redirect to Nicole — that's the script. Lying isn't great either, which is why option C works: you're not saying you don't know, you're saying Nicole is the right person to talk to. Then you go find her.",
    },
    {
      scenario: "An employee has missed two consecutive days without calling in. Their coworker tells you they saw the employee post on social media that they're \"done with this place.\" What do you do?",
      options: [
        { id: "a", text: "Wait one more day to see if they come back — the social media post isn't official" },
        { id: "b", text: "Notify Nicole immediately — two consecutive no-call/no-shows is a voluntary quit under policy" },
        { id: "c", text: "Call the employee to confirm they've quit before notifying Nicole" },
      ],
      correctId: "b",
      explanation: "The social media post doesn't matter. What matters is the policy: two consecutive days without reporting in and without calling is a voluntary quit. You don't investigate, you don't wait, you don't call. You notify Nicole and she handles it from there.",
    },
  ] : [];

  // Override first section for How We Show Up (both all and HR versions)
  if (currentModule.title.toLowerCase().includes("how we show up") && !currentModule.slug.endsWith("-hr")) {
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

  // Override "Mission, Vision, and Values" section content (skip for HR-specific modules)
  const missionSection = sections.find(
    (s) => s.title?.toLowerCase().includes("mission") && s.title?.toLowerCase().includes("values")
  );
  if (missionSection && !currentModule.slug.endsWith("-hr")) {
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
    .filter((item) => !item.tracks?.includes("management"))
    .sort((a, b) => a.order - b.order);
  const modulePosition = liveModules.findIndex((item) => item.slug === currentModule.slug) + 1 || currentModule.order;
  const totalModules = liveModules.length || currentModule.order;
  const completedModules = (progress ?? []).filter((item) => {
    const mod = liveModules.find((m) => m.slug === item.module_slug);
    return mod && item.module_completed;
  }).length;
  const outcomeLines = buildOutcomeLines(displaySections, hasQuiz, hasAcknowledgement);
  const humanMoments = buildHumanMoments(currentModule.title, hasQuiz, hasAcknowledgement, effectiveTrack, currentModule.slug);
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
              if (block.type === "download" || block.type === "link" || block.type === "qrcode") {
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
        {/* All gut checks rendered at page bottom, before Need Help */}
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
        {!isManagement && howWorkWorksGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={howWorkWorksGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && benefitsGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={benefitsGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && howWeShowUpGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={howWeShowUpGutChecks} />
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
        {!isManagement && safetyGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={safetyGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && toolkitGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={toolkitGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && impactGutChecksHR.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={impactGutChecksHR} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && impactGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={impactGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && qualityGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={qualityGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && beforeOfferGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={beforeOfferGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && afterOfferGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={afterOfferGutChecks} />
            </ModulePanel>
          </div>
        )}
        {!isManagement && exitsGutChecks.length > 0 && (
          <div className="mt-2">
            <ModulePanel>
              <GutCheckBlock scenarios={exitsGutChecks} />
            </ModulePanel>
          </div>
        )}
        {displaySections.length > 1
          ? renderSection(displaySections[displaySections.length - 1], displaySections.length - 1, "open")
          : null}

        {/* Notes & Questions widget — visible on all module types */}
        {!isPreviewing && (
          <div className="mt-6">
            <NoteWidget moduleSlug={currentModule.slug} moduleTitle={currentModule.title} />
          </div>
        )}

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

