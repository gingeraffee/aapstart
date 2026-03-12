"use client";

import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { modulesApi, progressApi, resourcesApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { WelcomeHeader } from "@/components/features/overview/WelcomeHeader";
import { TrackProgress } from "@/components/features/overview/TrackProgress";
import { ModuleCard } from "@/components/features/overview/ModuleCard";
import { CoachTip } from "@/components/features/overview/CoachTip";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleSummary, ProgressRecord, UiContent } from "@/lib/types";

export default function OverviewPage() {
  const { user } = useAuth();

  const { data: modules, isLoading: loadingModules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress, isLoading: loadingProgress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);
  const { data: uiData } = useSWR("ui", () => resourcesApi.ui() as Promise<UiContent>);

  const isLoading = loadingModules || loadingProgress;

  const progressMap = new Map<string, ProgressRecord>();
  progress?.forEach((item) => progressMap.set(item.module_slug, item));

  const publishedModules = (modules ?? []).filter((module) => module.status !== "draft");
  const completedCount = publishedModules.filter((module) => progressMap.get(module.slug)?.module_completed).length;

  if (isLoading) {
    return (
      <PageContainer size="wide">
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_22rem]">
            <WelcomeHeader
              name={user?.full_name ?? ""}
              track={user?.track ?? "administrative"}
              headers={uiData?.rotating_headers}
            />
            <TrackProgress total={publishedModules.length} completed={completedCount} />
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Your modules</p>
                <h2 className="mt-2 text-h2 text-brand-ink">Continue your guided path</h2>
              </div>
              <p className="max-w-xl text-ui text-text-secondary">
                Published modules stay visible, incomplete sections remain approachable, and anything not ready stays gracefully out of the way.
              </p>
            </div>

            <div className="space-y-4">
              {publishedModules.map((module, index) => (
                <div key={module.slug} className="animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
                  <ModuleCard module={module} progress={progressMap.get(module.slug)} index={index} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:pt-6">
          <CoachTip tips={uiData?.coach_tips} />
          <Card padding="md">
            <div className="space-y-4">
              <span className="section-kicker">Reference shelf</span>
              <div>
                <h3 className="text-h3 text-text-primary">Need a quick policy or tool link?</h3>
                <p className="mt-3 text-ui text-text-secondary">
                  The Resource Hub keeps the practical documents, links, and downloads you may need during onboarding and after.
                </p>
              </div>
              <Link href="/resources" className="inline-flex items-center gap-2 text-ui font-semibold text-brand-action hover:text-brand-deep">
                Explore resources
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}