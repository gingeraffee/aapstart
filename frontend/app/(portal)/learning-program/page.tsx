"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi, adminApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/context/AuthContext";
import type { DashboardData, ModuleSummary, ProgressRecord } from "@/lib/types";

function statCard(label: string, value: string | number, note: string) {
  return (
    <div
      key={label}
      className="rounded-[20px] p-5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
      }}
    >
      <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
        {label}
      </p>
      <p className="mt-3 text-[2rem] font-extrabold leading-none" style={{ color: "var(--heading-color)" }}>
        {value}
      </p>
      <p className="mt-1 text-[0.76rem]" style={{ color: "var(--card-desc)" }}>
        {note}
      </p>
    </div>
  );
}

export default function LearningProgramPage() {
  const { user } = useAuth();
  const router = useRouter();

  const isHRAdmin = user?.track === "hr" && user?.is_admin === true;

  const { data: modules, isLoading: loadingModules, error: modulesError } = useSWR("modules", () =>
    modulesApi.list() as Promise<ModuleSummary[]>
  );
  const { data: progress, isLoading: loadingProgress, error: progressError } = useSWR("progress", () =>
    progressApi.getAll() as Promise<ProgressRecord[]>
  );
  const { data: dashboardData } = useSWR(
    isHRAdmin ? "dashboard" : null,
    () => adminApi.dashboard() as Promise<DashboardData>
  );

  useEffect(() => {
    if (user && !isHRAdmin) {
      router.replace("/overview");
    }
  }, [isHRAdmin, router, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isHRAdmin) return null;

  if (loadingModules || loadingProgress) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const loadError = modulesError || progressError;
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-[1rem] font-semibold text-red-600">Could not load the learning program</p>
        <p className="max-w-sm text-[0.82rem]" style={{ color: "var(--module-context)" }}>{loadError.message}</p>
      </div>
    );
  }

  const progressMap = new Map<string, ProgressRecord>();
  progress?.forEach((item) => progressMap.set(item.module_slug, item));

  const liveModules = (modules ?? [])
    .filter((module) => module.status === "published")
    .sort((a, b) => a.order - b.order);
  const journeyModules = liveModules.filter((module) => !module.tracks?.includes("management"));

  const completedCount = journeyModules.filter((module) => progressMap.get(module.slug)?.module_completed).length;
  const inProgressCount = journeyModules.filter((module) => {
    const record = progressMap.get(module.slug);
    return record && !record.module_completed && (record.visited || record.acknowledgements_completed || record.quiz_passed);
  }).length;
  const currentModule = journeyModules.find((module) => !progressMap.get(module.slug)?.module_completed);
  const dashboardProgressMap = new Map((dashboardData?.module_progress ?? []).map((module) => [module.module_slug, module]));
  const participantCount = dashboardData
    ? dashboardData.completion.all_complete + dashboardData.completion.in_progress + dashboardData.completion.not_started
    : 0;
  const completionRate = participantCount > 0 && dashboardData
    ? Math.round((dashboardData.completion.all_complete / participantCount) * 100)
    : 0;

  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">
      <section
        className="relative overflow-hidden rounded-[26px] p-7 lg:p-8"
        style={{
          background: "linear-gradient(180deg, rgba(238, 251, 255, 0.96) 0%, rgba(247, 252, 255, 0.98) 100%)",
          border: "1px solid rgba(14, 165, 233, 0.16)",
          boxShadow: "0 18px 38px rgba(18, 39, 71, 0.12)",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[4px] bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_100%)]" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border" style={{ borderColor: "rgba(14, 165, 233, 0.18)" }} />

        <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ background: "rgba(14, 165, 233, 0.08)", color: "#0d6b9d" }}>
          <span className="h-2 w-2 rounded-full bg-[#22d3ee]" />
          Learning Program
        </p>
        <h1 className="mt-3 text-[clamp(1.7rem,3vw,2.35rem)] font-extrabold leading-[1.06]" style={{ color: "var(--heading-color)" }}>
          Training progression at a glance
        </h1>
        <p className="mt-2 max-w-[720px] text-[0.9rem] leading-[1.7]" style={{ color: "var(--card-desc)" }}>
          This workspace turns the onboarding curriculum into a clean progression view, so HR can scan the flow, spot weak modules, and jump into the right lesson fast.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/overview"
            className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)", color: "#ffffff" }}
          >
            Back to HR Dashboard
          </Link>
          <Link
            href="/roadmap"
            className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px"
            style={{ background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.18)", color: "#0d6b9d" }}
          >
            Open 90-Day Roadmap
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          statCard("Journey Modules", journeyModules.length, "Published modules in the learning flow"),
          statCard("Completed Personally", `${completedCount}/${journeyModules.length}`, currentModule ? `${currentModule.title} is next up` : "You have completed the full sequence"),
          statCard("Employees In Motion", dashboardData?.completion.in_progress ?? 0, `${dashboardData?.completion.not_started ?? 0} have not started yet`),
          statCard("Program Completion", `${completionRate}%`, `${dashboardData?.completion.all_complete ?? 0} employees fully complete`),
        ]}
      </section>

      <section
        className="mt-5 rounded-[24px] p-5 lg:p-6"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          boxShadow: "0 18px 36px rgba(17, 41, 74, 0.12)",
        }}
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#0d6b9d" }}>
              Progression List
            </p>
            <h2 className="mt-1 text-[1.18rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
              Every module in order
            </h2>
          </div>
          <p className="text-[0.78rem]" style={{ color: "var(--card-desc)" }}>
            Click any module to open its full learning experience.
          </p>
        </div>

        <div className="space-y-3.5">
          {journeyModules.map((module, index) => {
            const record = progressMap.get(module.slug);
            const dashboardModule = dashboardProgressMap.get(module.slug);
            const isComplete = record?.module_completed ?? false;
            const isInProgress = !isComplete && !!record && (record.visited || record.acknowledgements_completed || record.quiz_passed);
            const isCurrent = module.slug === currentModule?.slug;
            const stateLabel = isComplete ? "Completed" : isInProgress ? "In progress" : isCurrent ? "Up next" : "Ready";
            const stateColor = isComplete ? "#1c7a57" : isCurrent ? "#0d6b9d" : isInProgress ? "#0d6b9d" : "#17365d";
            const progressPct = dashboardModule && dashboardModule.total > 0
              ? Math.round((dashboardModule.completed / dashboardModule.total) * 100)
              : 0;

            return (
              <Link
                key={module.slug}
                href={`/modules/${module.slug}`}
                className="group relative flex gap-4 overflow-hidden rounded-[18px] p-5 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_16px_30px_rgba(17,41,74,0.14)]"
                style={{
                  background: isCurrent
                    ? "linear-gradient(180deg, rgba(241,252,255,0.96) 0%, rgba(255,255,255,0.98) 100%)"
                    : "var(--card-bg)",
                  border: isCurrent ? "1px solid rgba(14, 165, 233, 0.22)" : "1px solid var(--card-border)",
                  boxShadow: "0 12px 24px rgba(17, 41, 74, 0.1)",
                }}
              >
                <span
                  className="absolute inset-y-4 left-3 w-[2px] rounded-full"
                  style={{ background: isComplete ? "rgba(28, 122, 87, 0.8)" : "rgba(14, 165, 233, 0.82)" }}
                />
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold"
                  style={{ background: isComplete ? "rgba(28, 122, 87, 0.12)" : "rgba(14, 165, 233, 0.12)", color: stateColor }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>
                        Module {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-1 text-[0.98rem] font-semibold leading-snug" style={{ color: "var(--heading-color)" }}>
                        {module.title}
                      </h3>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[0.72rem] font-semibold" style={{ color: stateColor }}>
                        {stateLabel}
                      </p>
                      <p className="mt-1 text-[0.68rem]" style={{ color: "var(--module-context)" }}>
                        {Math.max(module.estimated_minutes, 1)} min
                      </p>
                    </div>
                  </div>

                  {module.description && (
                    <p className="mt-2 text-[0.8rem] leading-[1.62]" style={{ color: "var(--card-desc)" }}>
                      {module.description}
                    </p>
                  )}

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,220px] sm:items-end">
                    <div>
                      <div className="h-[4px] overflow-hidden rounded-full" style={{ background: "var(--welcome-progress-track)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progressPct}%`,
                            background: isComplete
                              ? "linear-gradient(90deg, #34d399 0%, #1fa37d 100%)"
                              : "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 100%)",
                          }}
                        />
                      </div>
                      <p className="mt-2 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
                        {dashboardModule ? `${dashboardModule.completed} of ${dashboardModule.total} employees complete this module` : "Team completion data will appear here when available."}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[0.73rem] font-semibold group-hover:underline" style={{ color: stateColor }}>
                        Open module -&gt;
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
