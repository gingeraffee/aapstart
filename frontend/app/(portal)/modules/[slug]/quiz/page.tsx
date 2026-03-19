"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { modulesApi, progressApi } from "@/lib/api";
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

  const { data: module, isLoading } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [wrongAttempts, setWrongAttempts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [correctMessage, setCorrectMessage] = useState(CORRECT_MESSAGES[0]);

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
        const correctAnswers: Record<string, string> = {};
        questions.forEach((q) => {
          const item = feedback?.feedback[q.id];
          if (item?.correct_id) {
            correctAnswers[q.id] = item.correct_id;
          }
        });
        await progressApi.submitQuiz(slug, correctAnswers);
        await mutate("progress");
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

  return (
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
      footer={
        <ModuleFooter
          backHref={`/modules/${slug}`}
          backLabel="Back to module"
          ctaLabel={isLastQuestion ? "Finish quick check" : "Next prompt"}
          onCtaClick={handleNext}
          disabled={!isRevealed || (!isCorrect && currentWrongAttempts < 2) || submitting}
          helperText={!isRevealed ? "Choose an answer to unlock feedback." : canRetry ? "One more pass and you are through." : undefined}
        />
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
                <p className="mt-1 text-[0.78rem] text-[#5d7391]">Choose the best answer. You get guidance right away.</p>
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
                    shouldRevealCorrect && isCorrectOption && "border-emerald-300 bg-emerald-50 text-emerald-700",
                    isRevealed && isSelected && !isCorrectOption && "border-[#efcf9b] bg-[#fff8ec] text-[#8b5a1f]",
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
        </div>
      </ModulePanel>
    </ModuleShell>
  );
}
