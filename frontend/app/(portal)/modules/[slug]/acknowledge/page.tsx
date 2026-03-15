"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { ChecklistItem } from "@/components/ui/ChecklistItem";
import { ModuleFooter, ModulePanel, ModuleShell, buildModuleSteps } from "@/components/features/modules/ModuleShell";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleDetail } from "@/lib/types";

export default function AcknowledgePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: module, isLoading } = useSWR(`module:${slug}`, () => modulesApi.get(slug) as Promise<ModuleDetail>);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!module) return;
    const hasAcknowledgement = module.requires_acknowledgement || module.acknowledgements.length > 0;
    const hasQuiz = module.requires_quiz || (module.quiz?.questions?.length ?? 0) > 0;
    if (hasAcknowledgement) return;
    router.replace(hasQuiz ? `/modules/${slug}/quiz` : `/modules/${slug}/complete`);
  }, [module, router, slug]);

  if (isLoading || !module) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasAcknowledgement = module.requires_acknowledgement || module.acknowledgements.length > 0;
  const hasQuiz = module.requires_quiz || (module.quiz?.questions?.length ?? 0) > 0;

  if (!hasAcknowledgement) {
    return null;
  }

  const currentModule = module;
  const allChecked = currentModule.acknowledgements.every((item) => checked[item.id]);

  const steps = buildModuleSteps({
    requiresAcknowledgement: hasAcknowledgement,
    requiresQuiz: hasQuiz,
    current: "confirm",
  });

  async function handleSubmit() {
    if (!allChecked) return;
    setSubmitting(true);
    setError(null);

    try {
      await progressApi.acknowledge(slug, currentModule.acknowledgements.map((item) => item.id));
      router.push(hasQuiz ? `/modules/${slug}/quiz` : `/modules/${slug}/complete`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <ModuleShell
      breadcrumbs={[
        { label: "My Path", href: "/overview" },
        { label: currentModule.title, href: `/modules/${slug}` },
        { label: "Confirmation" },
      ]}
      moduleOrder={currentModule.order}
      stageLabel="Confirmation"
      headline="Confirm the key expectations from this module."
      description="Check each statement once you understand it so we can safely move you to the final step."
      contextNote={currentModule.title}
      estimatedMinutes={2}
      steps={steps}
      footer={
        <ModuleFooter
          backHref={`/modules/${slug}`}
          backLabel="Back to module"
          ctaLabel={submitting ? "Saving..." : hasQuiz ? "Continue to quiz" : "Complete module"}
          onCtaClick={handleSubmit}
          disabled={!allChecked || submitting}
          helperText={!allChecked ? "Please confirm all items to continue." : undefined}
        />
      }
    >
      <ModulePanel>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-text-muted">Module recap</p>
        <p className="mt-1 text-[0.95rem] font-semibold text-text-primary">{currentModule.title}</p>
        {currentModule.description ? <p className="mt-1 text-[0.83rem] text-text-secondary">{currentModule.description}</p> : null}
      </ModulePanel>

      <ModulePanel>
        <p className="mb-4 text-[0.78rem] font-bold text-text-primary">Check each statement to confirm your understanding:</p>
        <div className="space-y-3">
          {currentModule.acknowledgements.map((ack) => (
            <ChecklistItem
              key={ack.id}
              label={ack.statement}
              checked={checked[ack.id] ?? false}
              onChange={(value) => setChecked((prev) => ({ ...prev, [ack.id]: value }))}
              className="border border-[#d6deeb] bg-white"
            />
          ))}
        </div>
      </ModulePanel>

      {error ? <p className="text-[0.88rem] text-brand-alert">{error}</p> : null}
    </ModuleShell>
  );
}
