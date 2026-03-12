"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { ChecklistItem } from "@/components/ui/ChecklistItem";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleDetail } from "@/lib/types";

export default function AcknowledgePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: module, isLoading } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !module) {
    return <PageContainer size="wide"><div className="flex justify-center py-24"><Spinner size="lg" /></div></PageContainer>;
  }

  const currentModule = module;
  const allChecked = currentModule.acknowledgements.every((item) => checked[item.id]);

  async function handleSubmit() {
    if (!allChecked) return;
    setSubmitting(true);
    setError(null);

    try {
      await progressApi.acknowledge(slug, currentModule.acknowledgements.map((item) => item.id));

      if (currentModule.requires_quiz) {
        router.push(`/modules/${slug}/quiz`);
      } else {
        router.push(`/modules/${slug}/complete`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
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
                <Link href={`/modules/${slug}`} className="hover:text-text-primary">{currentModule.title}</Link>
                <span>/</span>
                <span className="text-text-primary">Confirmation</span>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="section-kicker">Before you continue</span>
                  <h1 className="mt-4 text-h1 font-display text-brand-ink">Confirm the key expectations from this module.</h1>
                  <p className="mt-4 max-w-3xl text-ui text-text-secondary">
                    Review each statement below and confirm every item you understand before moving to the next step.
                  </p>
                </div>

                <StepIndicator
                  current="acknowledge"
                  requiresAcknowledgement={currentModule.requires_acknowledgement}
                  requiresQuiz={currentModule.requires_quiz}
                />
              </div>
            </div>
          </section>

          <Card padding="md">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Module recap</p>
            <p className="mt-3 text-ui font-semibold text-text-primary">{currentModule.title}</p>
            <p className="mt-2 text-caption text-text-secondary">{currentModule.description}</p>
          </Card>

          <Card padding="md">
            <div className="space-y-3">
              {currentModule.acknowledgements.map((ack) => (
                <ChecklistItem
                  key={ack.id}
                  label={ack.statement}
                  checked={checked[ack.id] ?? false}
                  onChange={(value) => setChecked((prev) => ({ ...prev, [ack.id]: value }))}
                  className="border border-border/70 bg-slate-950/[0.02]"
                />
              ))}
            </div>
          </Card>

          {error && <p className="text-ui text-brand-alert">{error}</p>}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href={`/modules/${slug}`} className="text-ui font-semibold text-text-muted hover:text-text-primary">
              ← Back to module
            </Link>
            <div className="flex flex-col items-end gap-2">
              <Button size="lg" disabled={!allChecked} loading={submitting} onClick={handleSubmit}>
                {currentModule.requires_quiz ? "Continue to quiz" : "Complete module"}
              </Button>
              {!allChecked && <p className="text-caption text-text-muted">Please confirm all items to continue.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:pt-4">
          <Card padding="md">
            <div className="space-y-4">
              <span className="section-kicker">Why this step matters</span>
              <p className="text-ui text-text-secondary">
                Acknowledgements are there to make sure important expectations are intentionally confirmed, not skimmed past.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}