"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ModuleDetail, QuizFeedback } from "@/lib/types";

const CORRECT_MESSAGES = [
  { headline: "Correct!", sub: "Great work — you nailed it. Keep that momentum going." },
  { headline: "That's right!", sub: "Locked in. You're building real knowledge here." },
  { headline: "Nice work!", sub: "One step closer to the finish line. Keep it up." },
  { headline: "You got it!", sub: "Solid. On to the next one." },
  { headline: "Exactly right.", sub: "You're paying attention — it shows." },
  { headline: "Yes! ✓", sub: "That's the one. Keep the streak going." },
  { headline: "Spot on!", sub: "That's exactly it. Well done." },
  { headline: "Perfect!", sub: "Zero hesitation. Let's keep moving." },
];

export default function QuizPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: module, isLoading } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [wrongAttempts, setWrongAttempts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const correctMsgRef = useRef(CORRECT_MESSAGES[0]);

  if (isLoading || !module) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const questions = module.quiz?.questions ?? [];
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
  // Only reveal which option is correct once they've missed it twice
  const shouldRevealCorrect = isRevealed && (isCorrect || currentWrongAttempts >= 2);

  const steps = [
    { key: "read", label: "Read" },
    ...(module.requires_acknowledgement ? [{ key: "confirm", label: "Confirm" }] : []),
    ...(module.requires_quiz ? [{ key: "quiz", label: "Quiz" }] : []),
  ];

  // ── Tap an answer → immediately submit (Duolingo-style) ──────────────────
  async function handleTap(optionId: string) {
    if (isRevealed || submitting) return;
    setSelected((prev) => ({ ...prev, [question.id]: optionId }));
    setSubmitting(true);
    try {
      const result = await progressApi.submitQuiz(slug, { [question.id]: optionId }) as QuizFeedback;
      const fb = result.feedback[question.id];
      setFeedback((prev) => ({
        ...result,
        feedback: { ...(prev?.feedback ?? {}), ...result.feedback },
      }));
      if (fb && !fb.correct) {
        setWrongAttempts((prev) => ({ ...prev, [question.id]: (prev[question.id] ?? 0) + 1 }));
      }
      // Pick a fresh correct message for this reveal
      correctMsgRef.current = CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
      setRevealed((prev) => ({ ...prev, [question.id]: true }));
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetryCurrent() {
    setSelected((prev) => { const n = { ...prev }; delete n[question.id]; return n; });
    setRevealed((prev) => ({ ...prev, [question.id]: false }));
    setFeedback((prev) => {
      if (!prev) return null;
      const f = { ...prev.feedback };
      delete f[question.id];
      return { ...prev, feedback: f };
    });
  }

  async function handleNext() {
    if (isLastQuestion) {
      setSubmitting(true);
      try {
        // The backend returns correct_id for ALL questions on every per-question
        // submission, so by the last question we have the full set. Submit them
        // all now so the backend can grade 100% correct and set quiz_passed = true.
        const correctAnswers: Record<string, string> = {};
        for (const q of questions) {
          const fb = feedback?.feedback[q.id];
          if (fb?.correct_id) {
            correctAnswers[q.id] = fb.correct_id;
          }
        }
        await progressApi.submitQuiz(slug, correctAnswers);
      } catch {
        // best effort — navigate regardless
      } finally {
        setSubmitting(false);
      }
      router.push(`/modules/${slug}/complete`);
    } else {
      setCurrentQ((i) => i + 1);
    }
  }

  return (
    <>
      <style>{`
        @keyframes feedback-pop {
          0%   { transform: scale(0.88) translateY(12px); opacity: 0; }
          70%  { transform: scale(1.02) translateY(-2px); opacity: 1; }
          100% { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pop-in {
          0%   { transform: scale(0.94); opacity: 0; }
          100% { transform: scale(1);    opacity: 1; }
        }
        .feedback-modal  { animation: feedback-pop 0.32s cubic-bezier(0.34,1.3,0.64,1) both; }
        .feedback-backdrop { animation: backdrop-in 0.18s ease both; }
        .option-pop-in   { animation: pop-in 0.18s ease both; }
      `}</style>

      <div className="flex min-h-[calc(100vh-64px)] flex-col">

        {/* ── Scrollable content area ── */}
        <div className="flex-1 w-full px-6 py-6 lg:px-8 lg:py-8 animate-fade-up">
          <div className="mx-auto max-w-[860px] space-y-5">

            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-text-muted">
              <Link href="/overview" className="hover:text-text-primary transition-colors">My Path</Link>
              <span>/</span>
              <Link href={`/modules/${slug}`} className="hover:text-text-primary transition-colors">{module.title}</Link>
              <span>/</span>
              <span className="text-text-primary font-medium">Quiz</span>
            </div>

            {/* Module header card */}
            <div
              className="relative overflow-hidden rounded-[20px]"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f2f8ff 100%)",
                boxShadow: "0 4px 24px rgba(14,118,189,0.13), 0 1px 6px rgba(0,0,0,0.07)",
                border: "1px solid rgba(14,118,189,0.16)",
              }}
            >
              <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #0e76bd 0%, #5d9fd2 60%, #22c55e 100%)" }} />
              <div className="px-7 pt-5 pb-6">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ color: "#0e76bd" }}>
                  Module {String(module.order).padStart(2, "0")} · Knowledge Check
                </p>
                <h1 className="mt-1.5 text-[clamp(1.4rem,2.5vw,1.8rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-text-primary">
                  Tap your answer — feedback is instant.
                </h1>
                <p className="mt-2 max-w-[600px] text-[0.88rem] leading-[1.65] text-text-secondary">
                  Select the best answer. You&apos;ll know right away if you&apos;re right — and can retry if not.
                </p>
                {/* Step path */}
                <div className="mt-4 flex items-center gap-1.5">
                  {steps.map((step, i) => (
                    <div key={step.key} className="flex items-center gap-1.5">
                      <div
                        className="flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[0.62rem] font-bold uppercase tracking-[0.06em]"
                        style={
                          step.key === "quiz"
                            ? { backgroundColor: "#0e76bd", color: "#fff" }
                            : { backgroundColor: "rgba(34,197,94,0.15)", color: "#16a34a" }
                        }
                      >
                        <span
                          className="flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full text-[0.48rem] font-black"
                          style={
                            step.key === "quiz"
                              ? { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff" }
                              : { backgroundColor: "rgba(34,197,94,0.3)", color: "#16a34a" }
                          }
                        >
                          {step.key === "quiz" ? i + 1 : "✓"}
                        </span>
                        {step.label}
                      </div>
                      {i < steps.length - 1 && (
                        <span style={{ color: "rgba(14,118,189,0.3)", fontSize: "0.7rem" }}>→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quiz card */}
            <div
              className="rounded-[16px] bg-white"
              style={{ border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
            >
              <div className="px-8 py-8 md:px-10 space-y-6">

                {/* Question header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                        Question {currentQ + 1} of {questions.length}
                      </p>
                      <h2 className="mt-2 text-[1.15rem] font-extrabold tracking-[-0.02em] text-text-primary">
                        {question.text}
                      </h2>
                    </div>
                    <span
                      className="shrink-0 rounded-[8px] px-3 py-1.5 text-[0.72rem] font-bold tabular-nums"
                      style={{ backgroundColor: "rgba(14,118,189,0.08)", color: "#0e76bd" }}
                    >
                      {currentQ + 1} / {questions.length}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(14,118,189,0.1)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${((currentQ + 1) / questions.length) * 100}%`,
                        background: "linear-gradient(90deg, #0e76bd, #22c55e)",
                      }}
                    />
                  </div>
                </div>

                {/* Answer options */}
                <div className="space-y-3">
                  {question.options.map((option, index) => {
                    const isSelected = selected[question.id] === option.id;
                    const isCorrectOption = option.id === correctId;
                    const isPending = submitting && isSelected;

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleTap(option.id)}
                        disabled={isRevealed || submitting}
                        className={cn(
                          "option-pop-in w-full rounded-[12px] border px-5 py-4 text-left text-[0.88rem] font-medium transition-all duration-200",
                          // Idle
                          !isSelected && !isRevealed && !submitting &&
                            "border-[#e5e7eb] bg-white hover:border-[#0e76bd]/40 hover:bg-blue-50/40 hover:shadow-sm active:scale-[0.985] cursor-pointer",
                          // Selected + pending (waiting for API)
                          isPending &&
                            "border-[#0e76bd]/50 bg-blue-50/60 opacity-80",
                          // Dimmed options while submitting (not the selected one)
                          submitting && !isSelected &&
                            "border-[#e5e7eb] bg-white opacity-40 cursor-not-allowed",
                          // Revealed: correct (only shown after 2 wrong attempts, or if they got it right)
                          shouldRevealCorrect && isCorrectOption &&
                            "border-[#22c55e]/50 bg-[#f0fdf4] text-[#16a34a] cursor-default",
                          // Revealed: wrong selection
                          isRevealed && isSelected && !isCorrectOption &&
                            "border-red-300/50 bg-red-50/60 text-red-600 cursor-default",
                          // Revealed: neutral (not selected, not correct)
                          isRevealed && !isSelected && !(shouldRevealCorrect && isCorrectOption) &&
                            "border-[#e5e7eb]/60 bg-gray-50/50 text-text-muted opacity-60 cursor-default",
                        )}
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <span className="flex items-center gap-3.5">
                          {/* Letter badge */}
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-black transition-all duration-200",
                              !isSelected && !isRevealed && "border border-[#d1d5db] text-[#6b7280]",
                              isPending && "border border-[#0e76bd] bg-[#0e76bd] text-white",
                              isSelected && !isRevealed && !submitting && "border border-[#0e76bd] bg-[#0e76bd] text-white",
                              shouldRevealCorrect && isCorrectOption && "bg-[#22c55e] text-white border-transparent",
                              isRevealed && isSelected && !isCorrectOption && "bg-red-500 text-white border-transparent",
                              isRevealed && !isSelected && !(shouldRevealCorrect && isCorrectOption) && "border border-[#d1d5db] text-[#9ca3af]",
                            )}
                          >
                            {shouldRevealCorrect && isCorrectOption
                              ? "✓"
                              : isRevealed && isSelected && !isCorrectOption
                                ? "✕"
                                : String.fromCharCode(65 + index)}
                          </span>
                          <span>{option.text}</span>
                          {/* Spinner while this option is being checked */}
                          {isPending && (
                            <span className="ml-auto">
                              <Spinner size="sm" />
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Back link — inside card, subtle */}
                <div className="pt-1">
                  <Link
                    href={`/modules/${slug}`}
                    className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-text-muted hover:text-text-primary transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 2L4 7l5 5" />
                    </svg>
                    Back to module
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ── Feedback modal — pops over the quiz ── */}
        {isRevealed && (
          <>
            {/* Backdrop */}
            <div
              className="feedback-backdrop fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(10,20,40,0.45)", backdropFilter: "blur(2px)" }}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="feedback-modal w-full max-w-[400px] overflow-hidden rounded-[20px]"
                style={{
                  background: isCorrect
                    ? "linear-gradient(150deg, #f0f7ff 0%, #dbeafe 100%)"
                    : "linear-gradient(150deg, #fff5f5 0%, #fee2e2 100%)",
                  boxShadow: isCorrect
                    ? "0 24px 64px rgba(14,118,189,0.22), 0 6px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)"
                    : "0 24px 64px rgba(239,68,68,0.18), 0 6px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
                  border: isCorrect
                    ? "1.5px solid rgba(14,118,189,0.35)"
                    : "1.5px solid rgba(239,68,68,0.35)",
                }}
              >
                {/* Accent bar */}
                <div
                  className="h-1.5 w-full"
                  style={{
                    background: isCorrect
                      ? "linear-gradient(90deg, #0e76bd, #5d9fd2)"
                      : "linear-gradient(90deg, #dc2626, #f87171)",
                  }}
                />

                <div className="flex flex-col items-center px-8 py-7 text-center">
                  {/* Icon */}
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[2rem]"
                    style={{
                      backgroundColor: isCorrect ? "rgba(14,118,189,0.12)" : "rgba(239,68,68,0.12)",
                      boxShadow: isCorrect
                        ? "0 4px 16px rgba(14,118,189,0.18), inset 0 1px 0 rgba(255,255,255,0.8)"
                        : "0 4px 16px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    {isCorrect ? "🎉" : "💡"}
                  </div>

                  {/* Headline */}
                  <h3
                    className="text-[1.5rem] font-extrabold tracking-[-0.02em]"
                    style={{ color: isCorrect ? "#0e4f80" : "#b91c1c" }}
                  >
                    {isCorrect ? correctMsgRef.current.headline : "Not quite."}
                  </h3>

                  {/* Sub-copy */}
                  <p className="mt-2 text-[0.85rem] leading-[1.6] text-text-secondary">
                    {isCorrect
                      ? correctMsgRef.current.sub
                      : currentWrongAttempts >= 2
                        ? "The correct answer is highlighted below. Review it and keep going — you've got this."
                        : "Not quite — give it another look and try again."}
                  </p>

                  {/* Action button */}
                  <div className="mt-6 w-full">
                    {isCorrect ? (
                      <button
                        onClick={handleNext}
                        disabled={submitting}
                        className="w-full rounded-[12px] py-3.5 text-[0.92rem] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
                        style={{
                          background: "linear-gradient(135deg, #0e76bd, #5d9fd2)",
                          boxShadow: "0 4px 16px rgba(14,118,189,0.35)",
                        }}
                      >
                        {submitting ? "Loading…" : isLastQuestion ? "Finish quiz" : "Next question →"}
                      </button>
                    ) : currentWrongAttempts >= 2 ? (
                      <button
                        onClick={handleNext}
                        disabled={submitting}
                        className="w-full rounded-[12px] py-3.5 text-[0.92rem] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
                        style={{
                          background: "linear-gradient(135deg, #dc2626, #f87171)",
                          boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
                        }}
                      >
                        {submitting ? "Loading…" : isLastQuestion ? "Finish quiz" : "Got it, next question →"}
                      </button>
                    ) : (
                      <button
                        onClick={handleRetryCurrent}
                        className="w-full rounded-[12px] py-3.5 text-[0.92rem] font-bold transition-all hover:-translate-y-px"
                        style={{
                          background: "#fff",
                          border: "2px solid #f87171",
                          color: "#dc2626",
                          boxShadow: "0 4px 16px rgba(239,68,68,0.15)",
                        }}
                      >
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}
