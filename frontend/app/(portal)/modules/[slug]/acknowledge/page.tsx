"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleTabBar } from "@/components/layout/ModuleTabBar";
import { ChecklistItem } from "@/components/ui/ChecklistItem";
import { Button } from "@/components/ui/Button";
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
    return <PageContainer><div className="flex justify-center py-24"><Spinner size="lg" /></div></PageContainer>;
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
    <PageContainer>
      <div className="space-y-6 animate-fade-up">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-text-muted">
          <Link href="/overview" className="hover:text-text-primary transition-colors">My Path</Link>
          <span>/</span>
          <Link href={`/modules/${slug}`} className="hover:text-text-primary transition-colors">{currentModule.title}</Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Confirmation</span>
        </div>

        {/* Title */}
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent">Before you continue</p>
          <h1 className="mt-2 text-[clamp(1.4rem,2.5vw,1.8rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-text-primary">
            Confirm the key expectations from this module.
          </h1>
          <p className="mt-3 max-w-2xl text-[0.93rem] leading-[1.7] text-text-secondary">
            Review each statement below and confirm every item you understand before moving to the next step.
          </p>
        </div>

        {/* Tab bar */}
        <ModuleTabBar
          slug={slug}
          current="acknowledge"
          requiresAcknowledgement={currentModule.requires_acknowledgement}
          requiresQuiz={currentModule.requires_quiz}
        />

        {/* Module recap card */}
        <div className="rounded-bento border border-border bg-surface p-6">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-text-muted">Module recap</p>
          <p className="mt-3 text-[0.93rem] font-semibold text-text-primary">{currentModule.title}</p>
          <p className="mt-2 text-[0.82rem] text-text-secondary">{currentModule.description}</p>
        </div>

        {/* Checklist card */}
        <div className="rounded-bento border border-border bg-surface p-6">
          <div className="space-y-3">
            {currentModule.acknowledgements.map((ack) => (
              <ChecklistItem
                key={ack.id}
                label={ack.statement}
                checked={checked[ack.id] ?? false}
                onChange={(value) => setChecked((prev) => ({ ...prev, [ack.id]: value }))}
                className="border border-border/70 bg-gray-50/50"
              />
            ))}
          </div>
        </div>

        {error && <p className="text-[0.88rem] text-brand-alert">{error}</p>}

        {/* Footer actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href={`/modules/${slug}`} className="text-[0.88rem] font-semibold text-text-muted hover:text-text-primary transition-colors">
            ← Back to module
          </Link>
          <div className="flex flex-col items-end gap-2">
            <Button size="lg" disabled={!allChecked} loading={submitting} onClick={handleSubmit}>
              {currentModule.requires_quiz ? "Continue to quiz" : "Complete module"}
            </Button>
            {!allChecked && <p className="text-[0.76rem] text-text-muted">Please confirm all items to continue.</p>}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
