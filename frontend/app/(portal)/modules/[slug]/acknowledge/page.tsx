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
  const checkedCount = currentModule.acknowledgements.filter((item) => checked[item.id]).length;
  const ackTotal = currentModule.acknowledgements.length;
  const ackPct = ackTotal > 0 ? Math.round((checkedCount / ackTotal) * 100) : 0;
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
      setError("We could not save this step just yet. Please try once more.");
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
      headline="Confirm the key takeaways."
      description="Mark each statement once it feels clear. This keeps your progress accurate and your next step ready."
      contextNote={currentModule.title}
      estimatedMinutes={2}
      steps={steps}
      footer={
        <ModuleFooter
          backHref={`/modules/${slug}`}
          backLabel="Back to module"
          ctaLabel={submitting ? "Saving..." : hasQuiz ? "Save and continue to quick check" : "Save and complete module"}
          onCtaClick={handleSubmit}
          disabled={!allChecked || submitting}
          helperText={!allChecked ? "Confirm each item to continue." : undefined}
        />
      }
    >
      <ModulePanel className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-text-muted">Module recap</p>
            <p className="mt-1 text-[0.95rem] font-semibold text-text-primary">{currentModule.title}</p>
            {currentModule.description ? <p className="mt-1 text-[0.83rem] text-text-secondary">{currentModule.description}</p> : null}
          </div>
          <div className="rounded-[10px] border border-[#c8dcf2] bg-white px-3 py-2 text-right">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[#5d7391]">Confirmed</p>
            <p className="mt-0.5 text-[1rem] font-extrabold text-[#0f6da3]">
              {checkedCount}
              <span className="ml-1 text-[0.74rem] font-semibold text-[#6a82a2]">of {ackTotal}</span>
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d6e6f9]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#0ea5d9_55%,#df0030_100%)] transition-all duration-300"
            style={{ width: `${Math.max(ackPct, 6)}%`, opacity: ackPct === 0 ? 0.35 : 1 }}
          />
        </div>
      </ModulePanel>

      <ModulePanel>
        <p className="mb-4 text-[0.8rem] font-semibold text-text-primary">
          Mark each statement once you are comfortable with it:
        </p>
        <div className="space-y-3">
          {currentModule.acknowledgements.map((ack) => (
            <ChecklistItem
              key={ack.id}
              label={ack.statement}
              checked={checked[ack.id] ?? false}
              onChange={(value) => setChecked((prev) => ({ ...prev, [ack.id]: value }))}
              className="bg-white"
            />
          ))}
        </div>
      </ModulePanel>

      {error ? <p className="text-[0.88rem] text-[#9a5f1f]">{error}</p> : null}
    </ModuleShell>
  );
}
