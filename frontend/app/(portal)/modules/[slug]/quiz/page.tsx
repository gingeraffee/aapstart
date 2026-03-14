"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ModuleDetail, QuizFeedback } from "@/lib/types";

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
  const [submitting, setSubmitting] = useState(false);

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
  const hasSelected = Boolean(selected[question.id]);
  const isRevealed = revealed[question.id] ?? false;
  const questionFeedback = feedback?.feedback[question.id];
  const isCorrect = questionFeedback?.correct ?? false;
  const correctId = questionFeedback?.correct_id;

  const steps = [
    { key: "read", label: "Read" },
    ...(module.requires_acknowledgement ? [{ key: "confirm", label: "Confirm" }] : []),
    ...(module.requires_quiz ? [{ key: "quiz", label: "Quiz" }] : []),
  ];

  function handleSelect(optionId: string) {
    if (isRevealed) return;
    setSelected((prev) => ({ ...prev, [question.id]: optionId }));
  }

  async function handleCheck() {
    if (!hasSelected || isRevealed) return;
    setSubmitting(true);

    try {
      const result = await progressApi.submitQuiz(slug, { [question.id]: selected[question.id] }) as QuizFeedback;
      setFeedback((prev) => ({
        ...result,
        feedback: { ...(prev?.feedback ?? {}), ...result.feedback },
        passed: result.passed,
        score: result.score,
        total: result.total,
        module_completed: result.module_completed,
      }));
      setRevealed((prev) => ({ ...prev, [question.id]: true }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    setSubmitting(true);
    try {
      const result = await progressApi.submitQuiz(slug, selected) as QuizFeedback;
      if (result.passed) {
        router.push(`/modules/${slug}/complete`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetryCurrent() {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });
    setRevealed((prev) => ({ ...prev, [question.id]: false }));
    setFeedback((prev) => {
      if (!prev) return null;
      const nextFeedback = { ...prev.feedback };
      delete nextFeedback[question.id];
      return { ...prev, feedback: nextFeedback };
    });
  }

  function handleNext() {
    if (isLastQuestion) {
      handleFinish();
      return;
    }
    setCurrentQ((index) => index + 1);
  }

  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8 animate-fade-up">
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
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, #0e76bd 0%, #5d9fd2 60%, #22c55e 100%)" }}
          />
          <div className="px-7 pt-5 pb-6">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ color: "#0e76bd" }}>
              Module {String(module.order).padStart(2, "0")} · Knowledge Check
            </p>
            <h1 className="mt-1.5 text-[clamp(1.4rem,2.5vw,1.8rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-text-primary">
              One question at a time. Move forward only when it is right.
            </h1>
            <p className="mt-2 max-w-[600px] text-[0.88rem] leading-[1.65] text-text-secondary">
              Answer each question, review the immediate feedback, and retry if needed before moving on.
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
          <div className="px-8 py-8 md:px-10">
            <div className="space-y-6">
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
                    className="shrink-0 rounded-[8px] px-3 py-1.5 text-[0.72rem] font-bold"
                    style={{ backgroundColor: "rgba(14,118,189,0.08)", color: "#0e76bd" }}
                  >
                    {currentQ + 1} / {questions.length}
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: "rgba(14,118,189,0.1)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
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

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      disabled={isRevealed}
                      className={cn(
                        "w-full rounded-[10px] border px-5 py-4 text-left text-[0.88rem] transition-all duration-200",
                        !isSelected && !isRevealed && "border-border bg-white hover:border-brand-action/30 hover:bg-blue-50/50",
                        isSelected && !isRevealed && "border-brand-action bg-blue-50 text-brand-action shadow-sm",
                        isRevealed && isCorrectOption && "border-success/30 bg-success-surface text-success",
                        isRevealed && isSelected && !isCorrectOption && "border-brand-alert/20 bg-brand-alert/[0.05] text-brand-alert",
                        isRevealed && !isSelected && !isCorrectOption && "border-border/60 bg-gray-50/50 text-text-muted"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.72rem] font-bold",
                            isSelected && !isRevealed ? "border-brand-action bg-brand-action text-white" : "border-current",
                            isRevealed && isCorrectOption ? "border-success bg-success text-white" : "",
                            isRevealed && isSelected && !isCorrectOption ? "border-brand-alert bg-brand-alert text-white" : ""
                          )}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span>{option.text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {isRevealed && (
                <div
                  className={cn(
                    "rounded-[10px] border px-4 py-4 text-[0.88rem] font-medium",
                    isCorrect
                      ? "border-success/20 bg-success-surface text-success"
                      : "border-brand-alert/20 bg-brand-alert/[0.05] text-brand-alert"
                  )}
                >
                  {isCorrect
                    ? "✓ Correct. Nice work."
                    : "Not quite. The correct answer is highlighted above. Try again before moving on."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex flex-col gap-3 rounded-[14px] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: "#f4f7fb", border: "1px solid #e5e7eb" }}
        >
          <Link
            href={`/modules/${slug}`}
            className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Back to module
          </Link>

          {!isRevealed ? (
            <Button size="lg" onClick={handleCheck} disabled={!hasSelected} loading={submitting}>
              Check answer
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="M5 2l5 5-5 5" />
              </svg>
            </Button>
          ) : isCorrect ? (
            <Button size="lg" onClick={handleNext} loading={submitting}>
              {isLastQuestion ? "Finish quiz" : "Next question →"}
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={handleRetryCurrent}>
              Try again
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
