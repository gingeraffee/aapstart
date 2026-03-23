"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import confetti from "canvas-confetti";
import { modulesApi, progressApi } from "@/lib/api";
import { usePreview } from "@/lib/context/PreviewContext";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ModuleDetail, QuizFeedback } from "@/lib/types";

const CORRECT_MESSAGES = [
  "Nice call. Keep that momentum.",
  "Exactly right.",
  "Strong answer.",
  "You got it.",
  "Great read. Onward.",
];

export default function QuizPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { isPreviewing } = usePreview();

  const { data: module, isLoading } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [wrongAttempts, setWrongAttempts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [correctMessage, setCorrectMessage] = useState(CORRECT_MESSAGES[0]);
  // Final review state
  const [missedQuestions, setMissedQuestions] = useState<string[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const confettiFired = useRef(false);

  const isFinalReview = module?.quiz_mode === "final-review";

  // Auto-advance timer for final review mode
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceToNext = useCallback(() => {
    const questions = module?.quiz?.questions ?? [];
    const isLast = currentQ === questions.length - 1;
    if (isLast) {
      // Quiz is done — calculate results
      const missed = Object.entries(wrongAttempts).filter(([, v]) => v >= 2).map(([k]) => k);
      // Also check current question's wrong attempts
      setMissedQuestions(missed);
      setQuizPassed(missed.length === 0);
      setQuizFinished(true);
    } else {
      setCurrentQ((v) => v + 1);
    }
  }, [currentQ, module, wrongAttempts]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

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
  const shouldRevealCorrect = !isFinalReview && isRevealed && (isCorrect || currentWrongAttempts >= 2);
  const canRetry = isRevealed && !isCorrect && currentWrongAttempts < 2;

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

      const wasWrong = item && !item.correct;
      const newWrongCount = wasWrong ? (wrongAttempts[question.id] ?? 0) + 1 : (wrongAttempts[question.id] ?? 0);

      if (wasWrong) {
        setWrongAttempts((prev) => ({ ...prev, [question.id]: newWrongCount }));
      } else {
        setCorrectMessage(CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)]);
      }

      setRevealed((prev) => ({ ...prev, [question.id]: true }));

      // Final review auto-advance
      if (isFinalReview) {
        if (!wasWrong) {
          // Correct — brief green flash then auto-advance
          advanceTimer.current = setTimeout(() => {
            const isLast = currentQ === questions.length - 1;
            if (isLast) {
              const missed = Object.keys(wrongAttempts).filter((k) => (wrongAttempts[k] ?? 0) >= 2);
              setMissedQuestions(missed);
              setQuizPassed(missed.length === 0);
              setQuizFinished(true);
            } else {
              setCurrentQ((v) => v + 1);
            }
          }, 800);
        } else if (newWrongCount >= 2) {
          // Second wrong attempt — mark as missed, auto-advance
          advanceTimer.current = setTimeout(() => {
            const allMissed = [...Object.keys(wrongAttempts).filter((k) => (wrongAttempts[k] ?? 0) >= 2), question.id];
            const uniqueMissed = [...new Set(allMissed)];
            const isLast = currentQ === questions.length - 1;
            if (isLast) {
              setMissedQuestions(uniqueMissed);
              setQuizPassed(false);
              setQuizFinished(true);
            } else {
              setCurrentQ((v) => v + 1);
            }
          }, 1200);
        }
        // First wrong attempt — no auto-advance, let them retry
      }
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
        // Best effort before navigation.
      } finally {
        setSubmitting(false);
      }
      router.push(`/modules/${slug}/complete`);
      return;
    }

    setCurrentQ((value) => value + 1);
  }

  // Final review: handle pass — submit correct answers and go to complete
  async function handleFinalPass() {
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
      // Best effort
    } finally {
      setSubmitting(false);
    }
    router.push(`/modules/${slug}/complete`);
  }

  // Final review: handle retry — reset all quiz state
  function handleRetry() {
    setCurrentQ(0);
    setSelected({});
    setFeedback(null);
    setRevealed({});
    setWrongAttempts({});
    setMissedQuestions([]);
    setQuizFinished(false);
    setQuizPassed(false);
    confettiFired.current = false;
  }

  // Final review: finished screen
  if (isFinalReview && quizFinished) {
    return (
      <FinalReviewResult
        passed={quizPassed}
        score={questions.length - missedQuestions.length}
        total={questions.length}
        moduleTitle={module.title}
        moduleTracks={module.tracks}
        steps={steps}
        slug={slug}
        moduleOrder={module.order}
        onRetry={handleRetry}
        onComplete={handleFinalPass}
        submitting={submitting}
        confettiFired={confettiFired}
      />
    );
  }

  return (
    <ModuleShell
      breadcrumbs={[
        { label: "My Path", href: "/overview" },
        { label: module.title, href: `/modules/${slug}` },
        { label: isFinalReview ? "Final Review" : "Quiz" },
      ]}
      moduleOrder={module.order}
      stageLabel={isFinalReview ? "Final Review" : "Quiz"}
      headline={isFinalReview ? "Final Review" : "Quick check, then keep moving."}
      description={
        isFinalReview
          ? "Answer all 20 questions. You must get every question right to complete your training."
          : "This is a confidence check, not a test. Pick what fits best and we will guide you from there."
      }
      contextNote={module.title}
      estimatedMinutes={Math.max(2, Math.round(questions.length * 0.8))}
      steps={steps}
      footer={
        isFinalReview ? (
          <ModuleFooter
            backHref={`/modules/${slug}`}
            backLabel="Back to module"
            ctaLabel=""
            disabled
            helperText={
              !isRevealed
                ? "Choose the best answer."
                : canRetry
                  ? "Not quite — give it one more try."
                  : undefined
            }
          />
        ) : (
          <ModuleFooter
            backHref={`/modules/${slug}`}
            backLabel="Back to module"
            ctaLabel={isLastQuestion ? "Finish quick check" : "Next prompt"}
            onCtaClick={handleNext}
            disabled={!isRevealed || (!isCorrect && currentWrongAttempts < 2) || submitting}
            helperText={!isRevealed ? "Choose an answer to unlock feedback." : canRetry ? "One more pass and you are through." : undefined}
          />
        )
      }
    >
      <ModulePanel>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                  Question {currentQ + 1} of {questions.length}
                </p>
                <h2 className="mt-2 text-[1.18rem] font-extrabold tracking-[-0.02em] text-text-primary">{question.text}</h2>
                {!isFinalReview && (
                  <p className="mt-1 text-[0.78rem] text-[#5d7391]">Choose the best answer. You get guidance right away.</p>
                )}
              </div>
              <span className="shrink-0 text-[0.76rem] font-semibold tabular-nums text-[#5d7391]">
                {currentQ + 1} / {questions.length}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-cyan-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0f7fb3_0%,#22d3ee_100%)] transition-all duration-500"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selected[question.id] === option.id;
              const isCorrectOption = option.id === correctId;

              return (
                <button
                  key={option.id}
                  onClick={() => handleTap(option.id)}
                  disabled={submitting || (isRevealed && (isCorrect || currentWrongAttempts >= 2))}
                  className={cn(
                    "w-full rounded-[12px] border px-4 py-3.5 text-left text-[0.88rem] font-medium transition-all duration-200",
                    !isSelected && !isRevealed && "border-[#d6deeb] bg-white hover:border-brand-action/40 hover:bg-cyan-50/30",
                    isSelected && !isRevealed && "border-brand-action/50 bg-cyan-50/50",
                    submitting && !isSelected && "opacity-55",
                    // Standard mode: show correct answer in green
                    shouldRevealCorrect && isCorrectOption && "border-emerald-300 bg-emerald-50 text-emerald-700",
                    // Final review mode: correct answer — brief green flash on selected only
                    isFinalReview && isRevealed && isCorrect && isSelected && "border-emerald-300 bg-emerald-50 text-emerald-700",
                    // Wrong answer — red in final review, amber in standard
                    isFinalReview && isRevealed && isSelected && !isCorrectOption && "border-red-300 bg-red-50 text-red-700",
                    !isFinalReview && isRevealed && isSelected && !isCorrectOption && "border-[#efcf9b] bg-[#fff8ec] text-[#8b5a1f]",
                    // Dim unselected options
                    isRevealed && !isSelected && !(shouldRevealCorrect && isCorrectOption) && "opacity-60"
                  )}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <span className="flex items-center gap-3.5">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-black",
                        !isSelected && !isRevealed && "border border-[#d1d5db] text-[#64748b]",
                        isSelected && !isRevealed && "bg-brand-action text-white",
                        shouldRevealCorrect && isCorrectOption && "bg-emerald-500 text-white",
                        isFinalReview && isRevealed && isCorrect && isSelected && "bg-emerald-500 text-white",
                        isFinalReview && isRevealed && isSelected && !isCorrectOption && "bg-red-500 text-white",
                        !isFinalReview && isRevealed && isSelected && !isCorrectOption && "bg-[#d9a04b] text-white",
                        isRevealed && !isSelected && !(shouldRevealCorrect && isCorrectOption) && !(isFinalReview && isRevealed && isCorrect && isSelected) && "border border-[#d1d5db] text-[#9ca3af]"
                      )}
                    >
                      {(shouldRevealCorrect && isCorrectOption) || (isFinalReview && isRevealed && isCorrect && isSelected)
                        ? "\u2713"
                        : (isRevealed && isSelected && !isCorrectOption)
                          ? "\u2717"
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

          {/* Feedback messages */}
          {isRevealed && !isFinalReview ? (
            <div
              className={cn(
                "rounded-[12px] border px-4 py-3",
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

          {/* Final review: wrong answer feedback */}
          {isRevealed && isFinalReview && !isCorrect && currentWrongAttempts < 2 ? (
            <div className="rounded-[12px] border border-red-200 bg-red-50/70 px-4 py-3">
              <p className="text-[0.82rem] font-semibold text-red-700">
                Not quite — give it one more try.
              </p>
            </div>
          ) : null}
        </div>
      </ModulePanel>
    </ModuleShell>
  );
}

/* ── Final Review Result Screen ──────────────────────────────────────────── */

function FinalReviewResult({
  passed,
  score,
  total,
  moduleTitle,
  moduleTracks,
  steps,
  slug,
  moduleOrder,
  onRetry,
  onComplete,
  submitting,
  confettiFired,
}: {
  passed: boolean;
  score: number;
  total: number;
  moduleTitle: string;
  moduleTracks: string[];
  steps: ReturnType<typeof buildModuleSteps>;
  slug: string;
  moduleOrder: number;
  onRetry: () => void;
  onComplete: () => void;
  submitting: boolean;
  confettiFired: React.MutableRefObject<boolean>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Celebration confetti for passing
  useEffect(() => {
    if (!passed || confettiFired.current) return;
    confettiFired.current = true;

    const colors = ["#0f7fb3", "#22d3ee", "#fbbf24", "#34d399", "#f472b6", "#6366f1"];

    // Big center burst
    confetti({ particleCount: 120, spread: 120, origin: { x: 0.5, y: 0.35 }, colors });

    // Staggered side bursts
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors });
    }, 400);

    // Sustained side streams
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 3, angle: 55 + Math.random() * 15, spread: 50, origin: { x: 0, y: 0.5 + Math.random() * 0.2 }, colors });
      confetti({ particleCount: 3, angle: 110 + Math.random() * 15, spread: 50, origin: { x: 1, y: 0.5 + Math.random() * 0.2 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // Final top rain
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 160, origin: { x: 0.5, y: -0.1 }, gravity: 0.6, ticks: 300, colors });
    }, 1500);
  }, [passed, confettiFired]);

  // Certificate download
  function downloadCertificate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 1200;
    const h = 850;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = "#0f4c81";
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    // Inner border
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    // Logo
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => {
      const logoW = 200;
      const logoH = (logo.height / logo.width) * logoW;
      ctx.drawImage(logo, (w - logoW) / 2, 70, logoW, logoH);
      drawCertText(ctx, w, h, logoH);
      triggerDownload(canvas);
    };
    logo.onerror = () => {
      // Draw without logo
      drawCertText(ctx, w, h, 0);
      triggerDownload(canvas);
    };
    logo.src = "/logo.png";
  }

  function drawCertText(ctx: CanvasRenderingContext2D, w: number, h: number, logoH: number) {
    const startY = 80 + Math.max(logoH, 60) + 20;

    // Certificate of Completion
    ctx.fillStyle = "#0f4c81";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.letterSpacing = "6px";
    ctx.fillText("CERTIFICATE OF COMPLETION", w / 2, startY);
    ctx.letterSpacing = "0px";

    // Divider line
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, startY + 18);
    ctx.lineTo(w / 2 + 120, startY + 18);
    ctx.stroke();

    // "This certifies that"
    ctx.fillStyle = "#5d7391";
    ctx.font = "16px Arial";
    ctx.fillText("This certifies that", w / 2, startY + 55);

    // Employee name placeholder
    ctx.fillStyle = "#0f4c81";
    ctx.font = "bold 36px Georgia";
    ctx.fillText("_______________________", w / 2, startY + 110);

    // "has successfully completed"
    ctx.fillStyle = "#5d7391";
    ctx.font = "16px Arial";
    ctx.fillText("has successfully completed the", w / 2, startY + 155);

    // Program name
    ctx.fillStyle = "#0f4c81";
    ctx.font = "bold 28px Georgia";
    ctx.fillText("AAP Start Training Program", w / 2, startY + 200);

    // Track
    ctx.fillStyle = "#5d7391";
    ctx.font = "16px Arial";
    const trackName = moduleTracks.includes("hr") ? "HR Administrative Assistant" : moduleTracks[0] ?? "";
    ctx.fillText(trackName + " Track", w / 2, startY + 240);

    // Score
    ctx.fillStyle = "#0f7fb3";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`Final Review: ${score}/${total}`, w / 2, startY + 285);

    // Date
    ctx.fillStyle = "#5d7391";
    ctx.font = "14px Arial";
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    ctx.fillText(today, w / 2, startY + 330);

    // Decorative corners
    const cornerSize = 20;
    ctx.strokeStyle = "#0f4c81";
    ctx.lineWidth = 3;
    // Top left
    ctx.beginPath(); ctx.moveTo(50, 70); ctx.lineTo(50, 50); ctx.lineTo(70, 50); ctx.stroke();
    // Top right
    ctx.beginPath(); ctx.moveTo(w - 50, 70); ctx.lineTo(w - 50, 50); ctx.lineTo(w - 70, 50); ctx.stroke();
    // Bottom left
    ctx.beginPath(); ctx.moveTo(50, h - 70); ctx.lineTo(50, h - 50); ctx.lineTo(70, h - 50); ctx.stroke();
    // Bottom right
    ctx.beginPath(); ctx.moveTo(w - 50, h - 70); ctx.lineTo(w - 50, h - 50); ctx.lineTo(w - 70, h - 50); ctx.stroke();
  }

  function triggerDownload(canvas: HTMLCanvasElement) {
    const link = document.createElement("a");
    link.download = "AAP_Start_Certificate.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (passed) {
    return (
      <ModuleShell
        breadcrumbs={[
          { label: "My Path", href: "/overview" },
          { label: moduleTitle, href: `/modules/${slug}` },
          { label: "Complete" },
        ]}
        moduleOrder={moduleOrder}
        stageLabel="Complete"
        headline="You did it!"
        description="You passed the final review with flying colors."
        contextNote={moduleTitle}
        steps={steps}
        footer={
          <ModuleFooter
            backHref={`/modules/${slug}`}
            backLabel="Back to module"
            ctaLabel="Complete Training"
            onCtaClick={onComplete}
            disabled={submitting}
          />
        }
      >
        <ModulePanel>
          <div className="flex flex-col items-center text-center py-6">
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-50 text-emerald-600">
              <span className="absolute inset-[-6px] rounded-full border border-emerald-200 opacity-60" />
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12.5 9.5 18 20 6" />
              </svg>
            </div>

            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-emerald-600">Training Complete</p>
            <h2 className="mt-3 text-[1.5rem] font-extrabold tracking-[-0.02em] text-text-primary">
              Congratulations!
            </h2>
            <p className="mt-3 max-w-[480px] text-[0.95rem] leading-[1.7] text-text-secondary">
              You scored <strong className="text-emerald-700">{score}/{total}</strong> on your final review.
              You&apos;ve completed the AAP Start Training Program — welcome to the team!
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={downloadCertificate}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#0f4c81] bg-[#0f4c81] px-6 py-3 text-[0.88rem] font-bold text-white transition-colors hover:bg-[#0d3d6b]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Certificate
              </button>
              <p className="text-[0.75rem] text-[#5d7391]">Save your certificate of completion</p>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </ModulePanel>
      </ModuleShell>
    );
  }

  // Failed — encouraging retry screen
  return (
    <ModuleShell
      breadcrumbs={[
        { label: "My Path", href: "/overview" },
        { label: moduleTitle, href: `/modules/${slug}` },
        { label: "Final Review" },
      ]}
      moduleOrder={moduleOrder}
      stageLabel="Final Review"
      headline="Almost there!"
      description="Review the content and try again when you're ready."
      contextNote={moduleTitle}
      steps={steps}
      footer={
        <ModuleFooter
          backHref={`/modules/${slug}`}
          backLabel="Back to module"
          ctaLabel="Try Again"
          onCtaClick={onRetry}
        />
      }
    >
      <ModulePanel>
        <div className="flex flex-col items-center text-center py-6">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#efcf9b] bg-[#fff8ec] text-[#d9a04b]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M3.6 20h16.8a1 1 0 0 0 .86-1.5l-8.4-14a1 1 0 0 0-1.72 0l-8.4 14A1 1 0 0 0 3.6 20z" />
            </svg>
          </div>

          <h2 className="text-[1.3rem] font-extrabold tracking-[-0.02em] text-text-primary">
            Not quite there yet
          </h2>
          <p className="mt-3 max-w-[480px] text-[0.92rem] leading-[1.7] text-text-secondary">
            You got <strong>{score}</strong> out of <strong>{total}</strong> right. You need a perfect score to complete this section,
            but that&apos;s okay — this material is detailed and worth another look.
          </p>
          <p className="mt-3 max-w-[440px] text-[0.88rem] leading-[1.7] text-[#5d7391]">
            Take a few minutes to review the modules, then come back and give it another shot.
            You&apos;ve got this.
          </p>

          <button
            onClick={onRetry}
            className="mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-brand-action bg-brand-action px-6 py-3 text-[0.88rem] font-bold text-white transition-colors hover:bg-[#0d6d96]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Try Again
          </button>
        </div>
      </ModulePanel>
    </ModuleShell>
  );
}
