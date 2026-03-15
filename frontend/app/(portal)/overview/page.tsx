"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { modulesApi, progressApi, resourcesApi } from "@/lib/api";
import { WelcomeHeader } from "@/components/features/overview/WelcomeHeader";
import { CelebrationModal } from "@/components/features/overview/CelebrationModal";
import { Spinner } from "@/components/ui/Spinner";
import { cn, pickRandom } from "@/lib/utils";
import { COACH_TIPS } from "@/lib/coachTips";
import type { ModuleSummary, ProgressRecord, UiContent } from "@/lib/types";

export default function OverviewPage() {
  const { user } = useAuth();

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
  const comingSoonCount = allModules.filter((m) => m.status === "coming_soon").length;
  const completedCount = liveModules.filter((m) => progressMap.get(m.slug)?.module_completed).length;

  const currentModule = liveModules.find((m) => !progressMap.get(m.slug)?.module_completed);

  useEffect(() => {
    if (isLoading) return;
    if (liveModules.length === 0) return;
    if (completedCount < liveModules.length) return;

    const key = `aapstart:celebrated:${user?.employee_id ?? "guest"}`;
    if (localStorage.getItem(key)) return;

    const t = setTimeout(() => setShowCelebration(true), 600);
    return () => clearTimeout(t);
  }, [isLoading, completedCount, liveModules.length, user?.employee_id]);

  const isModuleUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevSlug = liveModules[index - 1].slug;
    return progressMap.get(prevSlug)?.module_completed ?? false;
  };

  const nextToUnlockIndex = liveModules.findIndex((_, i) => !isModuleUnlocked(i));

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
        <p className="max-w-sm text-[0.82rem] text-text-muted">{loadError.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg px-4 py-2 text-[0.82rem] font-semibold text-white"
          style={{ background: "#0e76bd" }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">
      {showCelebration && (
        <CelebrationModal
          name={user?.full_name ?? firstName}
          completedCount={completedCount}
          onClose={handleCloseCelebration}
        />
      )}

      <div className="mb-6 animate-fade-up">
        <WelcomeHeader
          name={user?.full_name ?? ""}
          headers={uiData?.rotating_headers}
          currentModule={currentModule}
          completedCount={completedCount}
          totalCount={liveModules.length}
          comingSoonCount={comingSoonCount}
        />
      </div>

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, rgba(223,0,42,0.18) 0%, rgba(6,182,212,0.24) 100%)" }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 12 12"
                fill="none"
                stroke="#0e76bd"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 7.5L5.3 4.2 7.2 6.1 10 3.2" />
                <path d="M8.8 3.2h1.2v1.2" />
              </svg>
            </div>
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#64748b]">Your launch path</p>
              <h2 className="mt-0.5 text-[1.2rem] font-extrabold tracking-[-0.02em] text-[#0f172a]">
                {firstName}&apos;s learning journey
              </h2>
            </div>
          </div>

          <div className="space-y-2.5">
            {liveModules.map((module, index) => {
              const prog = progressMap.get(module.slug);
              const isComplete = prog?.module_completed ?? false;
              const isInProgress = !isComplete && (prog?.visited || prog?.acknowledgements_completed || prog?.quiz_passed);
              const isCurrent = module.slug === currentModule?.slug;
              const unlocked = isModuleUnlocked(index);
              const isNextToUnlock = index === nextToUnlockIndex;

              if (!unlocked) {
                return (
                  <div
                    key={module.slug}
                    className="flex gap-4 rounded-[16px] p-5"
                    style={
                      isNextToUnlock
                        ? {
                            background: "linear-gradient(150deg, #edf8ff 0%, #f7fbff 100%)",
                            border: "1.5px solid rgba(14,118,189,0.34)",
                            boxShadow: "0 0 0 3px rgba(6,182,212,0.1), 0 7px 20px rgba(14,118,189,0.11)",
                          }
                        : {
                            backgroundColor: "#e9eef7",
                            border: "1px solid rgba(108, 133, 174, 0.35)",
                            opacity: 0.82,
                          }
                    }
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn("flex h-7 w-7 items-center justify-center rounded-full", isNextToUnlock ? "animate-pulse" : "")}
                        style={{ backgroundColor: isNextToUnlock ? "rgba(6,182,212,0.2)" : "rgba(71, 85, 105, 0.14)" }}
                      >
                        <svg
                          width="11"
                          height="12"
                          viewBox="0 0 10 11"
                          fill="none"
                          className={isNextToUnlock ? "text-brand-bright" : "text-slate-500"}
                        >
                          <rect x="1" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M3 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[0.93rem] font-semibold leading-snug" style={{ color: isNextToUnlock ? "#0f1d3c" : "#64748b" }}>
                          {module.title}
                        </p>
                        {isNextToUnlock ? (
                          <span
                            className="shrink-0 rounded-[7px] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                            style={{ backgroundColor: "rgba(6,182,212,0.16)", color: "#0e76bd" }}
                          >
                            Up next
                          </span>
                        ) : (
                          <span
                            className="shrink-0 rounded-[7px] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em]"
                            style={{ backgroundColor: "rgba(100,116,139,0.15)", color: "#64748b" }}
                          >
                            Locked
                          </span>
                        )}
                      </div>
                      {module.description && (
                        <p className="mt-1 line-clamp-2 text-[0.78rem] leading-[1.55]" style={{ color: isNextToUnlock ? "#475569" : "#64748b" }}>
                          {module.description}
                        </p>
                      )}
                      {isNextToUnlock && (
                        <p className="mt-2 text-[0.72rem] font-semibold" style={{ color: "#0e76bd" }}>
                          Finish your current module to unlock this next step.
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              const cardStyle = isComplete
                ? {
                    background: "linear-gradient(135deg, #f2fcf5 0%, #ffffff 100%)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    boxShadow: "0 6px 18px rgba(22, 163, 74, 0.1)",
                  }
                : isInProgress
                  ? {
                      background: "linear-gradient(135deg, #ecf9ff 0%, #ffffff 100%)",
                      border: "1px solid rgba(6,182,212,0.36)",
                      boxShadow: "0 8px 22px rgba(14, 118, 189, 0.12)",
                    }
                  : {
                      background: "linear-gradient(135deg, #fff7f2 0%, #ffffff 100%)",
                      border: "1px solid rgba(251,146,60,0.32)",
                      boxShadow: "0 8px 20px rgba(223, 0, 42, 0.08)",
                    };

              const stateLabel = isComplete ? "Complete" : isInProgress ? "In progress" : isCurrent ? "Up next" : "Ready";
              const statePillStyle = isComplete
                ? { backgroundColor: "rgba(34,197,94,0.13)", color: "#16a34a" }
                : isInProgress
                  ? { backgroundColor: "rgba(6,182,212,0.15)", color: "#0e76bd" }
                  : isCurrent
                    ? { backgroundColor: "rgba(223,0,42,0.12)", color: "#df002a" }
                    : { backgroundColor: "rgba(251,146,60,0.16)", color: "#c2410c" };

              return (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  className="group flex gap-4 rounded-[16px] p-5 transition-all duration-200 hover:-translate-y-px"
                  style={cardStyle}
                >
                  <div className="mt-0.5 shrink-0">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[0.62rem] font-bold"
                      style={
                        isComplete
                          ? { backgroundColor: "rgba(34,197,94,0.16)", color: "#16a34a" }
                          : isInProgress
                            ? { backgroundColor: "rgba(6,182,212,0.16)", color: "#0e76bd" }
                            : { backgroundColor: "rgba(223,0,42,0.1)", color: "#df002a" }
                      }
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
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn("text-[0.95rem] font-semibold leading-snug", isComplete ? "text-[#334155]" : "text-[#0f172a]")}>
                        {module.title}
                      </p>
                      <span
                        className="shrink-0 rounded-[7px] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                        style={statePillStyle}
                      >
                        {stateLabel}
                      </span>
                    </div>
                    {module.description && (
                      <p className="mt-1 line-clamp-2 text-[0.8rem] leading-[1.55] text-[#475569]">{module.description}</p>
                    )}
                    <p
                      className="mt-2 text-[0.73rem] font-semibold transition-all group-hover:underline"
                      style={{ color: isComplete ? "#16a34a" : isInProgress ? "#0e76bd" : "#df002a" }}
                    >
                      {isComplete ? "Review module" : "Open module"} →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="w-[305px] shrink-0 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div
            className="overflow-hidden rounded-[16px]"
            style={{
              background: "linear-gradient(180deg, #fff8ec 0%, #fffdf7 100%)",
              border: "1px solid rgba(244, 114, 182, 0.2)",
              boxShadow: "0 10px 24px rgba(223, 0, 42, 0.08)",
            }}
          >
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #df002a 0%, #06b6d4 100%)" }} />
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(223,0,42,0.12)" }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#df002a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 1.5v6" />
                    <path d="M3.5 5.7A3.5 3.5 0 1 0 8.5 5.7" />
                  </svg>
                </span>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#be123c]">Coach Tip</span>
              </div>
              <p className="text-[0.84rem] leading-[1.65] text-[#1f2937]">{coachTip}</p>
              <p className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[#0e76bd]">
                You are doing better than you think.
              </p>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-[16px]"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              border: "1px solid rgba(14,118,189,0.16)",
              boxShadow: "0 8px 20px rgba(14,118,189,0.09)",
            }}
          >
            <div className="px-5 pb-3 pt-4" style={{ backgroundColor: "rgba(14,118,189,0.06)", borderBottom: "1px solid rgba(14,118,189,0.1)" }}>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#64748b]">Your HR support</p>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #df002a 0%, #0e76bd 100%)" }}
                >
                  NT
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[0.92rem] font-bold leading-tight text-[#0f172a]">Nicole Thornton</p>
                    <span
                      className="rounded-[4px] px-1.5 py-0.5 text-[0.54rem] font-bold uppercase tracking-[0.08em]"
                      style={{ backgroundColor: "rgba(14,118,189,0.12)", color: "#0e76bd" }}
                    >
                      Primary
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-[#64748b]">HR Manager</p>
                </div>
              </div>

              <p className="mb-3 rounded-[10px] px-3 py-2 text-[0.74rem] leading-[1.5] text-[#334155]" style={{ backgroundColor: "rgba(255,241,242,0.7)" }}>
                Need help or feeling stuck? Reach out and we will unblock the next step quickly.
              </p>

              <div className="space-y-2.5">
                <div>
                  <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#64748b]">Email</p>
                  <p className="mt-0.5 text-[0.8rem] text-[#0f172a]">nicole.thornton@apirx.com</p>
                </div>
                <div>
                  <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#64748b]">Phone</p>
                  <p className="mt-0.5 text-[0.8rem] text-[#0f172a]">256-574-7528</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href="mailto:nicole.thornton@apirx.com"
                  className="flex-1 rounded-[8px] py-2 text-center text-[0.73rem] font-semibold text-white transition-all hover:-translate-y-px"
                  style={{ background: "linear-gradient(135deg, #df002a 0%, #be123c 100%)", boxShadow: "0 8px 18px rgba(223,0,42,0.2)" }}
                >
                  Email Nicole
                </a>
                <a
                  href="tel:2565747528"
                  className="flex-1 rounded-[8px] py-2 text-center text-[0.73rem] font-semibold text-[#0e76bd] transition-all hover:-translate-y-px"
                  style={{ backgroundColor: "#ecf9ff", border: "1px solid rgba(14,118,189,0.25)" }}
                >
                  Call Nicole
                </a>
              </div>

              <div className="mt-4 border-t pt-3" style={{ borderColor: "rgba(148,163,184,0.2)" }}>
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#64748b]">Escalation support</p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #0e76bd, #1a2a5e)" }}
                  >
                    BH
                  </div>
                  <p className="text-[0.82rem] font-semibold text-[#0f172a]">Brandy Hooper</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
