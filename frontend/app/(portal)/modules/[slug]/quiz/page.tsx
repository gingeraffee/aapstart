"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    return <PageContainer size="wide"><div className="flex justify-center py-24"><Spinner size="lg" /></div></PageContainer>;
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
    <PageContainer size="wide">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6 animate-fade-up">
          <section className="premium-panel rounded-[34px] px-7 py-7 md:px-10 md:py-10">
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-caption text-text-muted">
                <Link href="/overview" className="hover:text-text-primary">My Path</Link>
                <span>/</span>
                <Link href={`/modules/${slug}`} className="hover:text-text-primary">{module.title}</Link>
                <span>/</span>
                <span className="text-text-primary">Quiz</span>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="section-kicker">Knowledge check</span>
                  <h1 className="mt-4 text-h1 font-display text-brand-ink">One question at a time. Move forward only when it is right.</h1>
                  <p className="mt-4 max-w-3xl text-ui text-text-secondary">
                    Answer each question, review the immediate feedback, and retry the same question if needed before advancing.
                  </p>
                </div>

                <StepIndicator
                  current="quiz"
                  requiresAcknowledgement={module.requires_acknowledgement}
                  requiresQuiz={module.requires_quiz}
                />
              </div>
            </div>
          </section>

          <Card padding="lg">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Question {currentQ + 1}</p>
                    <h2 className="mt-2 text-h2 text-text-primary">{question.text}</h2>
                  </div>
                  <span className="rounded-full border border-brand-action/15 bg-brand-action/[0.08] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-action">
                    {currentQ + 1} / {questions.length}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border/80">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] transition-all duration-300"
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
                        "w-full rounded-[24px] border px-5 py-4 text-left text-ui transition-all duration-200",
                        !isSelected && !isRevealed && "border-border bg-white hover:border-brand-action/25 hover:bg-info-surface/65",
                        isSelected && !isRevealed && "border-brand-action bg-info-surface text-brand-action shadow-sm",
                        isRevealed && isCorrectOption && "border-success/20 bg-success-surface text-success",
                        isRevealed && isSelected && !isCorrectOption && "border-brand-alert/15 bg-brand-alert/[0.05] text-brand-alert",
                        isRevealed && !isSelected && !isCorrectOption && "border-border/70 bg-slate-950/[0.02] text-text-muted"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-caption font-bold",
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
                  "rounded-[22px] border px-4 py-4 text-ui",
                  isCorrect ? "border-success/15 bg-success-surface text-success" : "border-brand-alert/15 bg-brand-alert/[0.05] text-brand-alert"
                )}>
                  {isCorrect ? "Correct. Nice work." : "Not quite. The correct answer is highlighted above. Update your answer and try again before moving on."}
                </div>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href={`/modules/${slug}`} className="text-ui font-semibold text-text-muted hover:text-text-primary">
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

        <div className="space-y-6 xl:pt-4">
          <Card padding="md">
            <div className="space-y-4">
              <span className="section-kicker">Quiz rules</span>
              <ul className="space-y-3 text-ui text-text-secondary">
                <li>You receive feedback immediately after each answer.</li>
                <li>If an answer is incorrect, you retry that same question before moving on.</li>
                <li>The module passes only when every question is answered correctly.</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}