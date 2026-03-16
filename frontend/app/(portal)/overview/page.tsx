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
        <p className="max-w-sm text-[0.82rem] text-[#64748b]">{loadError.message}</p>
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

  return (
    <div className="w-full px-6 py-5 lg:px-8 lg:py-7">
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
          totalCount={liveModules.length}
          comingSoonCount={comingSoonCount}
        />
      </div>

      <div className="flex items-start gap-5 max-[1220px]:flex-col">
        <div className="min-w-0 flex-1 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(14,165,233,0.14)" }}
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
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.11em] text-[#4f6a8c]">Your launch path</p>
              <h2 className="mt-0.5 text-[1.22rem] font-extrabold tracking-[-0.02em] text-[#0c2341]">
                {firstName}&apos;s learning journey
              </h2>
            </div>
          </div>

          <div className="space-y-3.5">
            {liveModules.map((module, index) => {
              const prog = progressMap.get(module.slug);
              const isComplete = prog?.module_completed ?? false;
              const isInProgress = !isComplete && (prog?.visited || prog?.acknowledgements_completed || prog?.quiz_passed);
              const isCurrent = module.slug === currentModule?.slug;
              const unlocked = isModuleUnlocked(index);
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
                            background: "#ffffff",
                            border: "1px solid rgba(107, 188, 244, 0.48)",
                            boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                          }
                        : {
                            background: "#ffffff",
                            border: "1px solid rgba(165, 185, 216, 0.42)",
                            opacity: 0.92,
                          }
                    }
                  >
                    <span
                      className="absolute inset-y-4 left-3 w-[2px] rounded-full"
                      style={{ background: isNextToUnlock ? "linear-gradient(180deg,#22d3ee_0%,#0ea5d9_100%)" : "rgba(148,163,184,0.35)" }}
                    />
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn("flex h-7 w-7 items-center justify-center rounded-full", isNextToUnlock ? "animate-pulse" : "")}
                        style={{ backgroundColor: isNextToUnlock ? "rgba(34,211,238,0.18)" : "rgba(100,116,139,0.14)" }}
                      >
                        <svg
                          width="11"
                          height="12"
                          viewBox="0 0 10 11"
                          fill="none"
                          className={isNextToUnlock ? "text-[#0f6da3]" : "text-slate-500"}
                        >
                          <rect x="1" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M3 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#6b84a3]">{moduleIndexLabel}</p>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[0.95rem] font-semibold leading-snug text-[#17304f]">{module.title}</p>
                        {isNextToUnlock ? (
                          <span className="shrink-0 text-[0.68rem] font-semibold" style={{ color: "#0d6b9d" }}>
                            Up next
                          </span>
                        ) : (
                          <span className="shrink-0 text-[0.68rem] font-medium" style={{ color: "#64748b" }}>
                            Locked
                          </span>
                        )}
                      </div>
                      {module.description && (
                        <p className="mt-1 line-clamp-2 text-[0.78rem] leading-[1.58] text-[#4d6788]">{module.description}</p>
                      )}
                      {isNextToUnlock && (
                        <p className="mt-2 text-[0.72rem] font-semibold text-[#0d6b9d]">
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
                        text: "#7a4d5f",
                        dot: "rgba(225, 29, 72, 0.13)",
                        bar: "linear-gradient(90deg,#fda4af_0%,#e11d48_100%)",
                        accent: "rgba(177, 48, 95, 0.8)",
                      }
                    : {
                        text: "#526b8a",
                        dot: "rgba(148,163,184,0.2)",
                        bar: "linear-gradient(90deg,#cbd5e1_0%,#94a3b8_100%)",
                        accent: "rgba(100, 116, 139, 0.74)",
                      };

              const cardStyle = isComplete
                ? {
                    background: "#ffffff",
                    border: "1px solid rgba(115, 197, 159, 0.5)",
                    boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                  }
                : isInProgress
                  ? {
                      background: "#ffffff",
                      border: "1px solid rgba(123, 189, 236, 0.5)",
                      boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                    }
                  : {
                      background: "#ffffff",
                      border: "1px solid rgba(220, 181, 205, 0.56)",
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
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#6b84a3]">{moduleIndexLabel}</p>
                      <p className="shrink-0 text-[0.67rem] font-semibold uppercase tracking-[0.08em] text-[#6b84a3]">
                        {Math.max(module.estimated_minutes, 1)} min
                      </p>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn("text-[0.96rem] font-semibold leading-snug", isComplete ? "text-[#1c5a43]" : "text-[#0e2342]")}>{module.title}</p>
                      <span className="shrink-0 text-[0.7rem] font-semibold" style={{ color: tone.text }}>{stateLabel}</span>
                    </div>

                    {module.description && (
                      <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-[1.58] text-[#516a88]">{module.description}</p>
                    )}

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <p className="text-[0.71rem] text-[#4f6889]">{stateHelper}</p>
                    </div>

                    <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-[#d2e1f2]">
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
        </div>

        <aside className="w-[314px] shrink-0 animate-fade-up max-[1220px]:w-full xl:sticky xl:top-[82px]" style={{ animationDelay: "100ms" }}>
          <div
            className="overflow-hidden rounded-[18px]"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(126, 185, 235, 0.34)",
              boxShadow: "0 14px 30px rgba(17, 41, 74, 0.12)",
            }}
          >
            <div className="h-[3px] w-full bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_62%,#d63964_100%)]" />

            <div className="relative p-5 pb-4">
              <span className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full border border-[#d8e7f8]" />
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
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#2d6596]">Coach Tip</span>
                </div>
                <span className="text-[0.95rem] text-[#8ba4c3]">&quot;</span>
              </div>
              <p className="text-[0.87rem] leading-[1.68] text-[#1a3150]">{coachTip}</p>
              <p className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[#0d6b9d]">
                Steady progress, strong start.
              </p>
            </div>

            <div className="mx-5 h-px bg-[#d8e5f5]" />

            <div className="p-5 pt-4">
              <p className="text-[0.59rem] font-bold uppercase tracking-[0.15em] text-[#47688f]">Your support contact</p>

              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #1d4f84 0%, #0ea5d9 100%)" }}
                >
                  NT
                </div>
                <div>
                  <p className="text-[0.9rem] font-bold leading-tight text-[#102343]">Nicole Thornton</p>
                  <p className="mt-0.5 text-[0.75rem] text-[#64748b]">HR Manager</p>
                </div>
              </div>

              <p className="mt-3 text-[0.77rem] leading-[1.58] text-[#314d6f]">
                Stuck on a step? Reach out and we will help you move forward quickly.
              </p>

              <div className="mt-3 space-y-2.5">
                <a
                  href="mailto:nicole.thornton@apirx.com"
                  className="group block rounded-[10px] border px-3 py-2 text-[0.76rem] font-semibold text-[#1d436b] transition-all duration-200 hover:-translate-y-px"
                  style={{ borderColor: "rgba(130, 174, 225, 0.48)", backgroundColor: "#ffffff" }}
                >
                  Email Nicole
                  <span className="mt-0.5 block text-[0.69rem] font-medium text-[#4b6687]">nicole.thornton@apirx.com</span>
                </a>
                <a
                  href="tel:2565747528"
                  className="group block rounded-[10px] border px-3 py-2 text-[0.76rem] font-semibold text-[#1d436b] transition-all duration-200 hover:-translate-y-px"
                  style={{ borderColor: "rgba(130, 174, 225, 0.48)", backgroundColor: "#ffffff" }}
                >
                  Call Nicole
                  <span className="mt-0.5 block text-[0.69rem] font-medium text-[#4b6687]">256-574-7528</span>
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
