"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleTabBar } from "@/components/layout/ModuleTabBar";
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
    return <PageContainer><div className="flex justify-center py-24"><Spinner size="lg" /></div></PageContainer>;
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
    <PageContainer>
      <div className="space-y-6 animate-fade-up">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-text-muted">
          <Link href="/overview" className="hover:text-text-primary transition-colors">My Path</Link>
          <span>/</span>
          <Link href={`/modules/${slug}`} className="hover:text-text-primary transition-colors">{module.title}</Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Quiz</span>
        </div>

        {/* Title */}
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent">Knowledge check</p>
          <h1 className="mt-2 text-[clamp(1.4rem,2.5vw,1.8rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-text-primary">
            One question at a time. Move forward only when it is right.
          </h1>
          <p className="mt-3 max-w-2xl text-[0.93rem] leading-[1.7] text-text-secondary">
            Answer each question, review the immediate feedback, and retry the same question if needed before advancing.
          </p>
        </div>

        {/* Tab bar */}
        <ModuleTabBar
          slug={slug}
          current="quiz"
          requiresAcknowledgement={module.requires_acknowledgement}
          requiresQuiz={module.requires_quiz}
        />

        {/* Quiz card */}
        <div className="rounded-bento border border-border bg-surface p-6 md:p-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-text-muted">Question {currentQ + 1}</p>
                  <h2 className="mt-2 text-[1.25rem] font-extrabold tracking-[-0.02em] text-text-primary">{question.text}</h2>
                </div>
                <span className="shrink-0 rounded-[6px] border border-border bg-bg-light px-3 py-1.5 text-[0.72rem] font-bold text-text-muted">
                  {currentQ + 1} / {questions.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
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

            {isRevealed && (
              <div className={cn(
                "rounded-[10px] border px-4 py-4 text-[0.88rem]",
                isCorrect ? "border-success/20 bg-success-surface text-success" : "border-brand-alert/20 bg-brand-alert/[0.05] text-brand-alert"
              )}>
                {isCorrect ? "Correct. Nice work." : "Not quite. The correct answer is highlighted above. Update your answer and try again before moving on."}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href={`/modules/${slug}`} className="text-[0.88rem] font-semibold text-text-muted hover:text-text-primary transition-colors">
            ← Back to module
          </Link>

          {!isRevealed ? (
            <Button size="lg" onClick={handleCheck} disabled={!hasSelected} loading={submitting}>
              Check answer
            </Button>
          ) : isCorrect ? (
            <Button size="lg" onClick={handleNext} loading={submitting}>
              {isLastQuestion ? "Finish quiz" : "Next question"}
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={handleRetryCurrent}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
