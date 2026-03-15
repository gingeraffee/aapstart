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
        <p className="text-[1rem] font-semibold text-red-300">Could not connect to the server</p>
        <p className="max-w-sm text-[0.82rem] text-slate-300">{loadError.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg px-4 py-2 text-[0.82rem] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #16406f 0%, #1268a2 100%)" }}
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

      <div className="flex items-start gap-5 max-[1220px]:flex-col">
        <div className="min-w-0 flex-1 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.24) 0%, rgba(201,47,88,0.24) 100%)" }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 12 12"
                fill="none"
                stroke="#8ee3ff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 7.5L5.3 4.2 7.2 6.1 10 3.2" />
                <path d="M8.8 3.2h1.2v1.2" />
              </svg>
            </div>
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-cyan-100/70">Your launch path</p>
              <h2 className="mt-0.5 text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
                {firstName}&apos;s learning journey
              </h2>
            </div>
          </div>

          <div className="space-y-3">
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
                    className="flex gap-4 rounded-[17px] p-5"
                    style={
                      isNextToUnlock
                        ? {
                            background: "linear-gradient(160deg, rgba(18,50,90,0.86) 0%, rgba(13,34,64,0.92) 100%)",
                            border: "1px solid rgba(142, 227, 255, 0.34)",
                            boxShadow: "0 16px 30px rgba(3, 10, 24, 0.4)",
                          }
                        : {
                            background: "linear-gradient(160deg, rgba(13,31,58,0.78) 0%, rgba(9,23,44,0.82) 100%)",
                            border: "1px solid rgba(116, 148, 194, 0.32)",
                            opacity: 0.8,
                          }
                    }
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn("flex h-7 w-7 items-center justify-center rounded-full", isNextToUnlock ? "animate-pulse" : "")}
                        style={{ backgroundColor: isNextToUnlock ? "rgba(34,211,238,0.2)" : "rgba(100,116,139,0.22)" }}
                      >
                        <svg
                          width="11"
                          height="12"
                          viewBox="0 0 10 11"
                          fill="none"
                          className={isNextToUnlock ? "text-cyan-200" : "text-slate-300"}
                        >
                          <rect x="1" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M3 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[0.95rem] font-semibold leading-snug text-slate-100">{module.title}</p>
                        {isNextToUnlock ? (
                          <span
                            className="shrink-0 rounded-[8px] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                            style={{ backgroundColor: "rgba(34,211,238,0.16)", color: "#93e3ff" }}
                          >
                            Up next
                          </span>
                        ) : (
                          <span
                            className="shrink-0 rounded-[8px] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em]"
                            style={{ backgroundColor: "rgba(100,116,139,0.25)", color: "#cbd5e1" }}
                          >
                            Locked
                          </span>
                        )}
                      </div>
                      {module.description && (
                        <p className="mt-1 line-clamp-2 text-[0.78rem] leading-[1.58] text-slate-300">{module.description}</p>
                      )}
                      {isNextToUnlock && (
                        <p className="mt-2 text-[0.72rem] font-semibold text-cyan-200">
                          Finish your current module to unlock this next step.
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              const cardStyle = isComplete
                ? {
                    background: "linear-gradient(160deg, rgba(12,55,48,0.86) 0%, rgba(9,34,40,0.9) 100%)",
                    border: "1px solid rgba(74, 222, 128, 0.34)",
                    boxShadow: "0 16px 30px rgba(3, 10, 24, 0.4)",
                  }
                : isInProgress
                  ? {
                      background: "linear-gradient(160deg, rgba(10,45,81,0.9) 0%, rgba(8,31,58,0.92) 100%)",
                      border: "1px solid rgba(103, 232, 249, 0.34)",
                      boxShadow: "0 16px 30px rgba(3, 10, 24, 0.44)",
                    }
                  : {
                      background: "linear-gradient(160deg, rgba(16,39,75,0.92) 0%, rgba(11,28,55,0.94) 100%)",
                      border: "1px solid rgba(245, 149, 169, 0.3)",
                      boxShadow: "0 16px 30px rgba(3, 10, 24, 0.44)",
                    };

              const stateLabel = isComplete ? "Complete" : isInProgress ? "In progress" : isCurrent ? "Up next" : "Ready";
              const statePillStyle = isComplete
                ? { backgroundColor: "rgba(74,222,128,0.18)", color: "#86efac" }
                : isInProgress
                  ? { backgroundColor: "rgba(103,232,249,0.2)", color: "#93e3ff" }
                  : isCurrent
                    ? { backgroundColor: "rgba(245,149,169,0.2)", color: "#f9a8d4" }
                    : { backgroundColor: "rgba(148,163,184,0.22)", color: "#cbd5e1" };

              return (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  className="group flex gap-4 rounded-[17px] p-5 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_18px_34px_rgba(3,10,24,0.5)]"
                  style={cardStyle}
                >
                  <div className="mt-0.5 shrink-0">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[0.62rem] font-bold"
                      style={
                        isComplete
                          ? { backgroundColor: "rgba(74,222,128,0.2)", color: "#86efac" }
                          : isInProgress
                            ? { backgroundColor: "rgba(103,232,249,0.2)", color: "#93e3ff" }
                            : { backgroundColor: "rgba(245,149,169,0.18)", color: "#f9a8d4" }
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
                      <p className={cn("text-[0.96rem] font-semibold leading-snug", isComplete ? "text-emerald-100" : "text-white")}>
                        {module.title}
                      </p>
                      <span
                        className="shrink-0 rounded-[8px] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                        style={statePillStyle}
                      >
                        {stateLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-[0.67rem] font-semibold uppercase tracking-[0.09em] text-cyan-100/72">
                      {Math.max(module.estimated_minutes, 1)} min module
                    </p>

                    {module.description && (
                      <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-[1.58] text-slate-200">{module.description}</p>
                    )}

                    <p
                      className="mt-2 text-[0.73rem] font-semibold transition-all group-hover:underline"
                      style={{ color: isComplete ? "#86efac" : isInProgress ? "#93e3ff" : "#f9a8d4" }}
                    >
                      {isComplete ? "Review module ->" : "Open module ->"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="w-[320px] shrink-0 space-y-4 animate-fade-up max-[1220px]:w-full" style={{ animationDelay: "100ms" }}>
          <div
            className="overflow-hidden rounded-[17px]"
            style={{
              background: "linear-gradient(160deg, rgba(18,45,84,0.9) 0%, rgba(10,28,56,0.94) 100%)",
              border: "1px solid rgba(143, 211, 255, 0.26)",
              boxShadow: "0 16px 30px rgba(3, 10, 24, 0.46)",
            }}
          >
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 56%, #c92f58 100%)" }} />
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(34,211,238,0.16)" }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#8ee3ff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 1.5v6" />
                    <path d="M3.5 5.7A3.5 3.5 0 1 0 8.5 5.7" />
                  </svg>
                </span>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-cyan-100/85">Coach Tip</span>
              </div>
              <p className="text-[0.85rem] leading-[1.66] text-slate-100">{coachTip}</p>
              <p className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-cyan-200">
                You are doing better than you think.
              </p>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-[17px]"
            style={{
              background: "linear-gradient(160deg, rgba(14,36,69,0.92) 0%, rgba(10,25,49,0.95) 100%)",
              border: "1px solid rgba(129, 188, 243, 0.24)",
              boxShadow: "0 16px 30px rgba(3, 10, 24, 0.46)",
            }}
          >
            <div className="px-5 pb-3 pt-4" style={{ backgroundColor: "rgba(14,165,233,0.1)", borderBottom: "1px solid rgba(125, 211, 252, 0.18)" }}>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-cyan-100/78">Your HR support</p>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5d9 75%, #c92f58 100%)" }}
                >
                  NT
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[0.92rem] font-bold leading-tight text-white">Nicole Thornton</p>
                    <span
                      className="rounded-[4px] px-1.5 py-0.5 text-[0.54rem] font-bold uppercase tracking-[0.08em]"
                      style={{ backgroundColor: "rgba(103,232,249,0.2)", color: "#93e3ff" }}
                    >
                      Primary
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-slate-300">HR Manager</p>
                </div>
              </div>

              <p className="mb-3 rounded-[10px] px-3 py-2 text-[0.74rem] leading-[1.5] text-slate-200" style={{ backgroundColor: "rgba(14,165,233,0.12)" }}>
                Need help or feeling stuck? Reach out and we will unblock the next step quickly.
              </p>

              <div className="space-y-2.5">
                <div>
                  <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-cyan-100/72">Email</p>
                  <p className="mt-0.5 text-[0.8rem] text-slate-100">nicole.thornton@apirx.com</p>
                </div>
                <div>
                  <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-cyan-100/72">Phone</p>
                  <p className="mt-0.5 text-[0.8rem] text-slate-100">256-574-7528</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href="mailto:nicole.thornton@apirx.com"
                  className="flex-1 rounded-[9px] py-2 text-center text-[0.73rem] font-semibold text-white transition-all hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, #163f71 0%, #0e69a8 100%)",
                    border: "1px solid rgba(153, 230, 255, 0.34)",
                    boxShadow: "0 10px 20px rgba(3, 10, 24, 0.38)",
                  }}
                >
                  Email Nicole
                </a>
                <a
                  href="tel:2565747528"
                  className="flex-1 rounded-[9px] py-2 text-center text-[0.73rem] font-semibold text-cyan-100 transition-all hover:-translate-y-px"
                  style={{
                    backgroundColor: "rgba(14,165,233,0.12)",
                    border: "1px solid rgba(153, 230, 255, 0.34)",
                  }}
                >
                  Call Nicole
                </a>
              </div>

              <div className="mt-4 border-t pt-3" style={{ borderColor: "rgba(148,163,184,0.24)" }}>
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-cyan-100/72">Escalation support</p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1d4ed8, #0ea5d9)" }}
                  >
                    BH
                  </div>
                  <p className="text-[0.82rem] font-semibold text-slate-100">Brandy Hooper</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
