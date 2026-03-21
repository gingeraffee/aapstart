"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import { modulesApi, progressApi, resourcesApi } from "@/lib/api";
import { WelcomeHeader } from "@/components/features/overview/WelcomeHeader";
import { CelebrationModal } from "@/components/features/overview/CelebrationModal";
import { Spinner } from "@/components/ui/Spinner";
import { cn, pickRandom } from "@/lib/utils";
import { COACH_TIPS } from "@/lib/coachTips";
import type { ModuleSummary, ProgressRecord, UiContent } from "@/lib/types";

export default function OverviewPage() {
  const { user } = useAuth();
  const { effectiveTrack, isPreviewing } = usePreview();
  const isManagement = effectiveTrack === "management";
  const isHR = effectiveTrack === "hr";

  const { data: modules, isLoading: loadingModules, error: modulesError } = useSWR("modules", () =>
    modulesApi.list() as Promise<ModuleSummary[]>
  );
  const { data: progress, isLoading: loadingProgress, error: progressError } = useSWR("progress", () =>
    progressApi.getAll() as Promise<ProgressRecord[]>
  );
  const { data: uiData } = useSWR("ui", () => resourcesApi.ui() as Promise<UiContent>);

  const isLoading = loadingModules || loadingProgress;
  const loadError = modulesError || progressError;

  const [showCelebration, setShowCelebration] = useState(false);

  const progressMap = new Map<string, ProgressRecord>();
  progress?.forEach((item) => progressMap.set(item.module_slug, item));

  const allModules = modules ?? [];
  const liveModules = allModules
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  // Split into journey modules and management modules
  const journeyModules = liveModules.filter((m) => !m.tracks?.includes("management"));
  const managementModules = liveModules.filter((m) => m.tracks?.includes("management"));

  const comingSoonCount = allModules.filter((m) => m.status === "coming_soon").length;
  const completedCount = journeyModules.filter((m) => progressMap.get(m.slug)?.module_completed).length;

  const currentModule = journeyModules.find((m) => !progressMap.get(m.slug)?.module_completed);

  useEffect(() => {
    if (isManagement) return; // No celebration for management track
    if (isLoading) return;
    if (journeyModules.length === 0) return;
    if (completedCount < journeyModules.length) return;

    const key = `aapstart:celebrated:${user?.employee_id ?? "guest"}`;
    if (localStorage.getItem(key)) return;

    const t = setTimeout(() => setShowCelebration(true), 600);
    return () => clearTimeout(t);
  }, [isManagement, isLoading, completedCount, journeyModules.length, user?.employee_id]);

  const isJourneyModuleUnlocked = (index: number) => {
    if (isHR && !isPreviewing) return true;
    if (index === 0) return true;
    const prevSlug = journeyModules[index - 1].slug;
    return progressMap.get(prevSlug)?.module_completed ?? false;
  };

  const nextToUnlockIndex = journeyModules.findIndex((_, i) => !isJourneyModuleUnlocked(i));

  const coachTip = useMemo(() => pickRandom(COACH_TIPS), []);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const handleCloseCelebration = () => {
    const key = `aapstart:celebrated:${user?.employee_id ?? "guest"}`;
    localStorage.setItem(key, "1");
    setShowCelebration(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-[1rem] font-semibold text-red-600">Could not connect to the server</p>
        <p className="max-w-sm text-[0.82rem]" style={{ color: "var(--module-context)" }}>{loadError.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg px-4 py-2 text-[0.82rem] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #184371 0%, #1268a2 100%)" }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Management Overview ────────────────────────────────────────────────────
  if (isManagement) {
    return (
      <div className="w-full px-6 py-5 font-sans lg:px-8 lg:py-7">
        <div className="mb-6 animate-fade-up">
          <div className="mb-1 flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, rgba(27,44,86,0.18) 0%, rgba(14,165,233,0.12) 100%)" }}
            >
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#1b2c56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h8M2 6h8M2 9h5" />
              </svg>
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.11em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
                Manager Resources
              </p>
            </div>
          </div>
          <h1 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
            Welcome, {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9rem] leading-[1.7]" style={{ color: "var(--card-desc)" }}>
            This portal contains process guides and reference materials designed to support you in your management role at AAP. Each document walks through a specific process step by step so you have a clear, consistent resource to reference when needed.
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-4">
            <h2 className="text-[1.1rem] font-bold tracking-[-0.01em]" style={{ color: "var(--heading-color)" }}>
              Process Guides
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {managementModules.map((module) => (
              <Link
                key={module.slug}
                href={`/modules/${module.slug}`}
                className="group relative overflow-hidden rounded-[16px] p-5 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_14px_24px_rgba(17,41,74,0.15)]"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                }}
              >
                <span className="absolute inset-y-4 left-3 w-[2px] rounded-full" style={{ background: "rgba(27, 44, 86, 0.5)" }} />
                <div className="pl-2">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--welcome-label-text)" }}>
                      Process Guide
                    </p>
                    <p className="shrink-0 text-[0.67rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)" }}>
                      {Math.max(module.estimated_minutes, 1)} min read
                    </p>
                  </div>
                  <p className="text-[0.96rem] font-semibold leading-snug" style={{ color: "var(--heading-color)" }}>{module.title}</p>
                  {module.description && (
                    <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-[1.58]" style={{ color: "var(--card-desc)" }}>{module.description}</p>
                  )}
                  <p className="mt-3 text-[0.73rem] font-semibold transition-all group-hover:underline" style={{ color: "#17365d" }}>
                    View guide -&gt;
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {managementModules.length === 0 && (
            <div className="rounded-[16px] p-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <p className="text-[0.88rem] font-semibold" style={{ color: "var(--heading-color)" }}>Process guides are being developed.</p>
              <p className="mt-1 text-[0.8rem]" style={{ color: "var(--card-desc)" }}>Check back soon for new management training materials.</p>
            </div>
          )}
        </div>

        <div className="mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <Link
            href="/resources"
            className="group inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[0.82rem] font-semibold transition-all duration-200 hover:-translate-y-px"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              boxShadow: "0 4px 12px rgba(17, 41, 74, 0.08)",
              color: "var(--heading-color)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h8M2 6h8M2 9h5" />
            </svg>
            Browse Resource Hub
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── Journey Overview (warehouse, administrative, HR) ───────────────────────
  return (
    <div className="w-full px-6 py-5 font-sans lg:px-8 lg:py-7">
      {showCelebration && (
        <CelebrationModal
          name={user?.full_name ?? firstName}
          completedCount={completedCount}
          onClose={handleCloseCelebration}
        />
      )}

      <div className="mb-5 animate-fade-up">
        <WelcomeHeader
          name={user?.full_name ?? ""}
          headers={uiData?.rotating_headers}
          currentModule={currentModule}
          completedCount={completedCount}
          totalCount={journeyModules.length}
          comingSoonCount={comingSoonCount}
        />
      </div>

      <div className="flex items-start gap-5 max-[1220px]:flex-col">
        <div className="min-w-0 flex-1 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.24) 0%, rgba(14,165,233,0.12) 100%)" }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 12 12"
                fill="none"
                stroke="#0f6da3"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 7.5L5.3 4.2 7.2 6.1 10 3.2" />
                <path d="M8.8 3.2h1.2v1.2" />
              </svg>
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.11em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
                Your launch path
              </p>
              <h2 className="mt-0.5 text-[1.22rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
                {firstName}&apos;s learning journey
              </h2>
            </div>
          </div>

          <div className="space-y-3.5">
            {journeyModules.map((module, index) => {
              const prog = progressMap.get(module.slug);
              const isComplete = prog?.module_completed ?? false;
              const isInProgress = !isComplete && (prog?.visited || prog?.acknowledgements_completed || prog?.quiz_passed);
              const isCurrent = module.slug === currentModule?.slug;
              const unlocked = isJourneyModuleUnlocked(index);
              const isNextToUnlock = index === nextToUnlockIndex;
              const moduleIndexLabel = `Module ${String(index + 1).padStart(2, "0")}`;
              const progressPct = isComplete
                ? 100
                : prog?.quiz_passed || prog?.acknowledgements_completed
                  ? 72
                  : prog?.visited
                    ? 38
                    : isCurrent
                      ? 24
                      : 10;

              if (!unlocked) {
                return (
                  <div
                    key={module.slug}
                    className="relative flex gap-4 overflow-hidden rounded-[17px] p-5 transition-all duration-200"
                    style={
                      isNextToUnlock
                        ? {
                            background: "var(--card-bg)",
                            border: "1px solid var(--card-border-featured)",
                            boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                          }
                        : {
                            background: "var(--card-bg)",
                            border: "1px solid var(--card-border)",
                            boxShadow: "var(--card-shadow)",
                          }
                    }
                  >
                    <span
                      className="absolute inset-y-4 left-3 w-[2px] rounded-full"
                      style={{ background: "linear-gradient(180deg,#22d3ee_0%,#0ea5d9_100%)" }}
                    />
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn("flex h-7 w-7 items-center justify-center rounded-full", isNextToUnlock ? "animate-pulse" : "")}
                        style={{ backgroundColor: "rgba(34,211,238,0.18)" }}
                      >
                        <svg
                          width="11"
                          height="12"
                          viewBox="0 0 10 11"
                          fill="none"
                          className="text-[#0f6da3]"
                        >
                          <rect x="1" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M3 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--welcome-label-text)" }}>{moduleIndexLabel}</p>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[0.95rem] font-semibold leading-snug" style={{ color: "var(--heading-color)" }}>{module.title}</p>
                        {isNextToUnlock ? (
                          <span className="shrink-0 text-[0.68rem] font-semibold" style={{ color: "var(--status-progress)" }}>
                            Up next
                          </span>
                        ) : (
                          <span className="shrink-0 text-[0.68rem] font-medium" style={{ color: "var(--heading-color)" }}>
                            Locked
                          </span>
                        )}
                      </div>
                      {module.description && (
                        <p className="mt-1 line-clamp-2 text-[0.78rem] leading-[1.58]" style={{ color: "var(--heading-color)" }}>{module.description}</p>
                      )}
                      {isNextToUnlock && (
                        <p className="mt-2 text-[0.72rem] font-semibold" style={{ color: "var(--status-progress)" }}>
                          Finish your current module to unlock this next step.
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              const stateLabel = isComplete ? "Completed" : isInProgress ? "In progress" : isCurrent ? "Up next" : "Ready";
              const stateHelper = isComplete
                ? "Completed and available to review."
                : isInProgress
                  ? "Resume right where you left off."
                  : isCurrent
                    ? "Best next step for your journey."
                    : "Available when you are ready.";

              const tone = isComplete
                ? {
                    text: "#2f8768",
                    dot: "rgba(34,197,94,0.14)",
                    bar: "linear-gradient(90deg,#34d399_0%,#1fa37d_100%)",
                    accent: "rgba(33, 161, 123, 0.85)",
                  }
                : isInProgress
                  ? {
                      text: "#0d6b9d",
                      dot: "rgba(56,189,248,0.18)",
                      bar: "linear-gradient(90deg,#22d3ee_0%,#0ea5d9_100%)",
                      accent: "rgba(14, 127, 179, 0.84)",
                    }
                  : isCurrent
                    ? {
                        text: "#0d6b9d",
                        dot: "rgba(14,165,233,0.18)",
                        bar: "linear-gradient(90deg,#0b1e3d_0%,#0ea5d9_60%,#22d3ee_100%)",
                        accent: "rgba(14, 165, 233, 0.85)",
                      }
                    : {
                        text: "#17365d",
                        dot: "rgba(27,44,86,0.12)",
                        bar: "linear-gradient(90deg,#0b1e3d_0%,#7fa9d7_100%)",
                        accent: "rgba(27, 44, 86, 0.74)",
                      };

              const cardStyle = isComplete
                ? {
                    background: "var(--card-bg)",
                    border: "1px solid rgba(115, 197, 159, 0.5)",
                    boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                  }
                : isInProgress
                  ? {
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border-featured)",
                      boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                    }
                  : {
                      background: "var(--card-bg)",
                      border: isCurrent ? "1px solid rgba(14, 165, 233, 0.4)" : "1px solid rgba(159, 183, 214, 0.58)",
                      boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                    };

              return (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  className="group relative flex gap-4 overflow-hidden rounded-[16px] p-5 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_14px_24px_rgba(17,41,74,0.15)]"
                  style={cardStyle}
                >
                  <span className="absolute inset-y-4 left-3 w-[2px] rounded-full" style={{ background: tone.accent }} />
                  <div className="mt-0.5 shrink-0">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[0.62rem] font-bold"
                      style={{ backgroundColor: tone.dot, color: tone.text }}
                    >
                      {isComplete ? (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 6.5l2.5 2.5L10 3" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p
                        className="text-[0.62rem] font-bold uppercase tracking-[0.1em]"
                        style={{ color: isCurrent ? "#0d6b9d" : "var(--welcome-label-text)" }}
                      >
                        {moduleIndexLabel}
                      </p>
                      <p className="shrink-0 text-[0.67rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)" }}>
                        {Math.max(module.estimated_minutes, 1)} min
                      </p>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.96rem] font-semibold leading-snug" style={{ color: isComplete ? "#1c5a43" : "var(--heading-color)" }}>{module.title}</p>
                      <span className="shrink-0 text-[0.7rem] font-semibold" style={{ color: tone.text }}>{stateLabel}</span>
                    </div>

                    {module.description && (
                      <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-[1.58]" style={{ color: "var(--card-desc)" }}>{module.description}</p>
                    )}

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <p className="text-[0.71rem]" style={{ color: "var(--card-desc)" }}>{stateHelper}</p>
                    </div>

                    <div className="mt-3 h-[3px] overflow-hidden rounded-full" style={{ background: "var(--welcome-progress-track)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%`, background: tone.bar }}
                      />
                    </div>

                    <p className="mt-2 text-[0.73rem] font-semibold transition-all group-hover:underline" style={{ color: tone.text }}>
                      {isComplete ? "Review module ->" : isInProgress ? "Continue module ->" : "Open module ->"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Management Processes section (HR only) ── */}
          {isHR && managementModules.length > 0 && (
            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: "linear-gradient(135deg, rgba(27,44,86,0.18) 0%, rgba(14,165,233,0.12) 100%)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#1b2c56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h8M2 6h8M2 9h5" />
                  </svg>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.11em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
                    Manager Resources
                  </p>
                  <h2 className="mt-0.5 text-[1.22rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
                    Management Processes
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {managementModules.map((module) => (
                  <Link
                    key={module.slug}
                    href={`/modules/${module.slug}`}
                    className="group relative overflow-hidden rounded-[16px] p-5 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_14px_24px_rgba(17,41,74,0.15)]"
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                    }}
                  >
                    <span className="absolute inset-y-4 left-3 w-[2px] rounded-full" style={{ background: "rgba(27, 44, 86, 0.5)" }} />
                    <div className="pl-2">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--welcome-label-text)" }}>
                          Process Guide
                        </p>
                        <p className="shrink-0 text-[0.67rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)" }}>
                          {Math.max(module.estimated_minutes, 1)} min read
                        </p>
                      </div>
                      <p className="text-[0.96rem] font-semibold leading-snug" style={{ color: "var(--heading-color)" }}>{module.title}</p>
                      {module.description && (
                        <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-[1.58]" style={{ color: "var(--card-desc)" }}>{module.description}</p>
                      )}
                      <p className="mt-3 text-[0.73rem] font-semibold transition-all group-hover:underline" style={{ color: "#17365d" }}>
                        View guide -&gt;
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isManagement && <aside className="w-[314px] shrink-0 animate-fade-up max-[1220px]:w-full xl:sticky xl:top-[82px]" style={{ animationDelay: "100ms" }}>
          <div
            className="overflow-hidden rounded-[18px]"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border-featured)",
              boxShadow: "0 14px 30px rgba(17, 41, 74, 0.12)",
            }}
          >
            <div className="h-[3px] w-full bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_62%,#d63964_100%)]" />

            <div className="relative p-5 pb-4">
              <span className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full border" style={{ borderColor: "var(--welcome-circle-border)" }} />
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: "rgba(14,165,233,0.12)" }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="#0d6b9d"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 1.5v6" />
                      <path d="M3.5 5.7A3.5 3.5 0 1 0 8.5 5.7" />
                    </svg>
                  </span>
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--status-progress)" }}>Coach Tip</span>
                </div>
                <span className="text-[0.95rem] text-[#8ba4c3]">&quot;</span>
              </div>
              <p className="text-[0.87rem] leading-[1.68]" style={{ color: "var(--welcome-label-text)" }}>{coachTip}</p>
              <p className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--status-progress)" }}>
                Steady progress, strong start.
              </p>
            </div>

            <div className="mx-5 h-px" style={{ background: "var(--module-step-divider)" }} />

            <div className="p-5 pt-4">
              <p className="text-[0.59rem] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--module-context)" }}>Your People Person</p>

              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #1d4f84 0%, #0ea5d9 100%)" }}
                >
                  NT
                </div>
                <div>
                  <p className="text-[0.9rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>Nicole Thornton</p>
                  <p className="mt-0.5 text-[0.75rem]" style={{ color: "var(--module-context)" }}>HR Manager</p>
                </div>
              </div>

              <p className="mt-3 text-[0.77rem] leading-[1.58]" style={{ color: "var(--card-desc)" }}>
                Stuck on a step? Reach out and we will help you move forward quickly.
              </p>

              <div className="mt-3 space-y-2.5">
                <a
                  href="mailto:nicole.thornton@apirx.com"
                  className="group block rounded-[10px] border px-3 py-2 text-[0.76rem] font-semibold transition-all duration-200 hover:-translate-y-px"
                  style={{ borderColor: "var(--module-pill-border)", backgroundColor: "var(--login-input-bg)", color: "var(--welcome-label-text)" }}
                >
                  Email Nicole
                  <span className="mt-0.5 block text-[0.69rem] font-medium text-[var(--card-desc)]">nicole.thornton@apirx.com</span>
                </a>
                <a
                  href="tel:2565747528"
                  className="group block rounded-[10px] border px-3 py-2 text-[0.76rem] font-semibold transition-all duration-200 hover:-translate-y-px"
                  style={{ borderColor: "var(--module-pill-border)", backgroundColor: "var(--login-input-bg)", color: "var(--welcome-label-text)" }}
                >
                  Call Nicole
                  <span className="mt-0.5 block text-[0.69rem] font-medium text-[var(--card-desc)]">256-574-7528</span>
                </a>
              </div>
            </div>
          </div>
        </aside>}
      </div>
    </div>
  );
}
