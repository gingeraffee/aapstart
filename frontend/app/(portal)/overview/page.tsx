"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { modulesApi, progressApi, resourcesApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { WelcomeHeader } from "@/components/features/overview/WelcomeHeader";
import { TrackProgress } from "@/components/features/overview/TrackProgress";
import { ModuleCard } from "@/components/features/overview/ModuleCard";
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

  // First non-completed module is the "featured" one
  const featuredIndex = publishedModules.findIndex(
    (m) => m.status === "published" && !progressMap.get(m.slug)?.module_completed
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Top row: Welcome + Stats */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px] animate-fade-up">
        <WelcomeHeader
          name={user?.full_name ?? ""}
          track={user?.track ?? "administrative"}
          headers={uiData?.rotating_headers}
        />
        <TrackProgress total={publishedModules.length} completed={completedCount} />
      </div>

      {/* Modules heading */}
      <div className="mt-10 mb-5 animate-fade-up" style={{ animationDelay: "50ms" }}>
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-text-muted">Modules</p>
        <h2 className="mt-1 text-[1.5rem] font-extrabold tracking-[-0.03em] text-text-primary">Continue your guided path</h2>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {publishedModules.map((module, index) => (
          <div
            key={module.slug}
            className={`animate-fade-up ${index === featuredIndex ? "md:col-span-2" : ""}`}
            style={{ animationDelay: `${(index + 2) * 50}ms` }}
          >
            <ModuleCard
              module={module}
              progress={progressMap.get(module.slug)}
              index={index}
              featured={index === featuredIndex}
            />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
