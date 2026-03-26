"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import confetti from "canvas-confetti";
import { modulesApi, progressApi } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import { ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ModuleDetail, ModuleSummary, ProgressRecord, QuizFeedback } from "@/lib/types";

const CORRECT_MESSAGES = [
  "Nice call. Keep that momentum.",
  "Exactly right.",
  "Strong answer.",
  "You got it.",
  "Great read. Onward.",
];

const COMPLETION_MESSAGES: ((name: string, moduleTitle: string) => { headline: string; body: string })[] = [
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

const ALL_DONE_MESSAGES: ((name: string) => { headline: string; body: string })[] = [
  (name) => ({
    headline: `You did it, ${name}!`,
    body: "Every module, every quiz, every acknowledgement — done. You just completed your full onboarding journey. That's a serious accomplishment.",
  }),
  (name) => ({
    headline: `${name}, you're officially onboarded.`,
    body: "You worked through every module from start to finish. The foundation is set — now go make an impact.",
  }),
  (name) => ({
    headline: `Strong finish, ${name}.`,
    body: "That's every module in the books. You showed up, did the work, and now you're ready for whatever comes next.",
  }),
];

function fireConfetti() {
  const palettes = [
    ["#0f7fb3", "#22d3ee", "#38bdf8", "#fbbf24", "#34d399", "#a78bfa"],
    ["#f472b6", "#fbbf24", "#34d399", "#818cf8", "#22d3ee", "#fb923c"],
    ["#0f7fb3", "#6366f1", "#a78bfa", "#f472b6", "#fbbf24", "#34d399"],
    ["#22d3ee", "#2dd4bf", "#34d399", "#fbbf24", "#fb923c", "#f87171"],
    ["#818cf8", "#c084fc", "#f472b6", "#fbbf24", "#22d3ee", "#0f7fb3"],
  ];
  const colors = palettes[Math.floor(Math.random() * palettes.length)];

  // Center burst
  confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.4 }, colors });

  // Side streams
  const end = Date.now() + 2500;
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

export default function QuizPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { user } = useAuth();
  const { isPreviewing } = usePreview();

  const { data: module, isLoading } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);
  const { data: allModules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [wrongAttempts, setWrongAttempts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [correctMessage, setCorrectMessage] = useState(CORRECT_MESSAGES[0]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionMsg, setCompletionMsg] = useState<{ headline: string; body: string } | null>(null);
  const confettiFired = useRef(false);

  if (isLoading || !module) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const questions = module.quiz?.questions ?? [];
  const hasAcknowledgement = module.requires_acknowledgement || module.acknowledgements.length > 0;
  const hasQuiz = module.requires_quiz || questions.length > 0;
  if (questions.length === 0) {
    router.replace(`/modules/${slug}/complete`);
    return null;
  }

  const question = questions[currentQ];
  const isLastQuestion = currentQ === questions.length - 1;
  const isRevealed = revealed[question.id] ?? false;
  const questionFeedback = feedback?.feedback[question.id];
  const isCorrect = questionFeedback?.correct ?? false;
  const correctId = questionFeedback?.correct_id;
  const currentWrongAttempts = wrongAttempts[question.id] ?? 0;
  const shouldRevealCorrect = isRevealed && (isCorrect || currentWrongAttempts >= 2);
  const canRetry = isRevealed && !isCorrect && currentWrongAttempts < 2;

  // Determine next module
  const liveModules = (allModules ?? [])
    .filter((item) => item.status === "published")
    .sort((a, b) => a.order - b.order);
  const currentIndex = liveModules.findIndex((item) => item.slug === slug);
  const nextModule = currentIndex >= 0 ? liveModules[currentIndex + 1] ?? null : null;

  // Check if all modules will be done after this one completes
  const progressMap = new Map<string, ProgressRecord>();
  (progress ?? []).forEach((item) => progressMap.set(item.module_slug, item));
  const willBeAllDone = liveModules.every(
    (item) => item.slug === slug || progressMap.get(item.slug)?.module_completed
  );

  const steps = buildModuleSteps({
    requiresAcknowledgement: hasAcknowledgement,
    requiresQuiz: hasQuiz,
    current: "quiz",
  });

  async function handleTap(optionId: string) {
    if (submitting) return;
    if (isRevealed && (isCorrect || currentWrongAttempts >= 2)) return;

    if (isRevealed && !isCorrect && currentWrongAttempts < 2) {
      setRevealed((prev) => ({ ...prev, [question.id]: false }));
    }

    setSelected((prev) => ({ ...prev, [question.id]: optionId }));
    setSubmitting(true);

    try {
      const result = (await progressApi.submitQuiz(slug, { [question.id]: optionId })) as QuizFeedback;
      const item = result.feedback[question.id];

      setFeedback((prev) => ({
        ...result,
        feedback: { ...(prev?.feedback ?? {}), ...result.feedback },
      }));

      if (item && !item.correct) {
        setWrongAttempts((prev) => ({ ...prev, [question.id]: (prev[question.id] ?? 0) + 1 }));
      } else {
        setCorrectMessage(CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)]);
      }

      setRevealed((prev) => ({ ...prev, [question.id]: true }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (isLastQuestion) {
      setSubmitting(true);
      try {
        if (!isPreviewing) {
          const correctAnswers: Record<string, string> = {};
          questions.forEach((q) => {
            const item = feedback?.feedback[q.id];
            if (item?.correct_id) {
              correctAnswers[q.id] = item.correct_id;
            }
          });
          await progressApi.submitQuiz(slug, correctAnswers);
          await mutate("progress");
        }
      } catch {
        // Best effort before showing completion.
      } finally {
        setSubmitting(false);
      }

      // Show completion modal instead of navigating to complete page
      const firstName = user?.first_name ?? "there";
      if (willBeAllDone) {
        const msg = ALL_DONE_MESSAGES[Math.floor(Math.random() * ALL_DONE_MESSAGES.length)];
        setCompletionMsg(msg(firstName));
      } else {
        const msg = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
        setCompletionMsg(msg(firstName, module?.title ?? ""));
      }
      setShowCompletion(true);

      if (!confettiFired.current) {
        confettiFired.current = true;
        fireConfetti();
      }
      return;
    }

    setCurrentQ((value) => value + 1);
  }

  function handleKeepGoing() {
    if (willBeAllDone || !nextModule) {
      router.push("/overview");
    } else {
      router.push(`/modules/${nextModule.slug}`);
    }
  }

  return (
    <>
      {showCompletion && completionMsg ? (
        <>
          <style>{`
            @keyframes completion-in {
              0% { opacity: 0; transform: translateY(12px) scale(0.97); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes completion-bg-in {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `}</style>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(15, 32, 58, 0.58)", backdropFilter: "blur(5px)", animation: "completion-bg-in 200ms ease-out both" }}
          >
            <div
              className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-[#c2daf1] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] shadow-[0_24px_56px_rgba(9,20,41,0.24)]"
              style={{ animation: "completion-in 280ms ease-out both" }}
            >
              <div className="h-1 w-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_52%,#df0030_100%)]" />
              <div className="px-8 pb-8 pt-7 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#9dd2ef] bg-[#eaf6ff] text-[#0f6da3]">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5 9.5 18 20 6" />
                  </svg>
                </div>
                <h2 className="text-[1.6rem] font-extrabold leading-[1.12] tracking-[-0.025em] text-[#0f1d3c]">
                  {completionMsg.headline}
                </h2>
                <p className="mt-3 text-[0.88rem] leading-[1.68] text-[#445b78]">
                  {completionMsg.body}
                </p>
                <button
                  onClick={handleKeepGoing}
                  className="mt-6 w-full rounded-[12px] border border-[#6eaeea] bg-[linear-gradient(135deg,#184371_0%,#13629a_100%)] py-3 text-[0.9rem] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_18px_rgba(15,127,179,0.24)]"
                >
                  {willBeAllDone ? "View My Journey" : "Keep Going!"}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <ModuleShell
        breadcrumbs={[
          { label: "My Path", href: "/overview" },
          { label: module.title, href: `/modules/${slug}` },
          { label: "Quiz" },
        ]}
        moduleOrder={module.order}
        stageLabel="Quiz"
        headline="Quick check, then keep moving."
        description="This is a confidence check, not a test. Pick what fits best and we will guide you from there."
        contextNote={module.title}
        estimatedMinutes={Math.max(2, Math.round(questions.length * 0.8))}
        steps={steps}
      >
        <ModulePanel>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                    Question {currentQ + 1} of {questions.length}
                  </p>
                  <h2 className="mt-1.5 text-[1.1rem] font-extrabold tracking-[-0.02em] text-text-primary">{question.text}</h2>
                  <p className="mt-0.5 text-[0.76rem] text-[#5d7391]">Choose the best answer. You get guidance right away.</p>
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isRevealed || (!isCorrect && currentWrongAttempts < 2) || submitting}
                  className="group relative flex shrink-0 items-center gap-2 disabled:opacity-30 disabled:cursor-default"
                  aria-label={isLastQuestion ? "Finish quick check" : "Next question"}
                >
                  <span className="text-[0.75rem] font-semibold tracking-[-0.01em] text-[#17365d] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-disabled:!opacity-0">
                    {isLastQuestion ? "Finish" : "Next"}
                  </span>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(27,44,86,0.14)] bg-white text-[#17365d] shadow-[0_2px_6px_rgba(12,24,47,0.08)] transition-all duration-200 group-hover:border-[#0f7fb3] group-hover:bg-[#0f7fb3] group-hover:text-white group-hover:shadow-[0_4px_14px_rgba(15,127,179,0.28)] group-disabled:hover:border-[rgba(27,44,86,0.14)] group-disabled:hover:bg-white group-disabled:hover:text-[#17365d] group-disabled:hover:shadow-[0_2px_6px_rgba(12,24,47,0.08)]"
                  >
                    {isLastQuestion ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12.5 9.5 18 20 6" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3l5 5-5 5" />
                      </svg>
                    )}
                  </span>
                </button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cyan-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0f7fb3_0%,#22d3ee_100%)] transition-all duration-500"
                  style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {question.options.map((option, index) => {
                const isSelected = selected[question.id] === option.id;
                const isCorrectOption = option.id === correctId;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleTap(option.id)}
                    disabled={submitting || (isRevealed && (isCorrect || currentWrongAttempts >= 2))}
                    className={cn(
                      "w-full rounded-[12px] border px-3.5 py-2.5 text-left text-[0.85rem] font-medium transition-all duration-200",
                      !isSelected && !isRevealed && "border-[#d6deeb] bg-white hover:border-brand-action/40 hover:bg-cyan-50/30",
                      isSelected && !isRevealed && "border-brand-action/50 bg-cyan-50/50",
                      submitting && !isSelected && "opacity-55",
                      shouldRevealCorrect && isCorrectOption && "border-emerald-300 bg-emerald-50 text-emerald-700",
                      isRevealed && isSelected && !isCorrectOption && "border-[#efcf9b] bg-[#fff8ec] text-[#8b5a1f]",
                      isRevealed && !isSelected && !(shouldRevealCorrect && isCorrectOption) && "opacity-60"
                    )}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-black",
                          !isSelected && !isRevealed && "border border-[#d1d5db] text-[#64748b]",
                          isSelected && !isRevealed && "bg-brand-action text-white",
                          shouldRevealCorrect && isCorrectOption && "bg-emerald-500 text-white",
                          isRevealed && isSelected && !isCorrectOption && "bg-[#d9a04b] text-white",
                          isRevealed && !isSelected && !(shouldRevealCorrect && isCorrectOption) && "border border-[#d1d5db] text-[#9ca3af]"
                        )}
                      >
                        {shouldRevealCorrect && isCorrectOption
                          ? "OK"
                          : isRevealed && isSelected && !isCorrectOption
                            ? "!"
                            : String.fromCharCode(65 + index)}
                      </span>
                      <span>{option.text}</span>
                      {submitting && isSelected ? (
                        <span className="ml-auto">
                          <Spinner size="sm" />
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {isRevealed ? (
              <div
                className={cn(
                  "rounded-[10px] border px-3.5 py-2.5",
                  isCorrect || currentWrongAttempts >= 2
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-[#efcf9b] bg-[#fff8ec]"
                )}
              >
                <p className={cn("text-[0.82rem] font-semibold", isCorrect || currentWrongAttempts >= 2 ? "text-emerald-700" : "text-[#8b5a1f]")}>
                  {isCorrect
                    ? correctMessage
                    : currentWrongAttempts >= 2
                      ? "No worries. We highlighted the best answer so you can keep moving."
                      : "Close. Take one more pass and you are through."}
                </p>
              </div>
            ) : null}
          </div>
        </ModulePanel>
      </ModuleShell>
    </>
  );
}
