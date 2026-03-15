"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { modulesApi, progressApi, resourcesApi } from "@/lib/api";
import { WelcomeHeader } from "@/components/features/overview/WelcomeHeader";
import { CelebrationModal } from "@/components/features/overview/CelebrationModal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { pickRandom } from "@/lib/utils";
import { COACH_TIPS } from "@/lib/coachTips";
import type { ModuleSummary, ProgressRecord, UiContent } from "@/lib/types";

export default function OverviewPage() {
  const { user } = useAuth();

  const { data: modules, isLoading: loadingModules, error: modulesError } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress, isLoading: loadingProgress, error: progressError } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);
  const { data: uiData } = useSWR("ui", () => resourcesApi.ui() as Promise<UiContent>);

  const isLoading = loadingModules || loadingProgress;
  const loadError = modulesError || progressError;

  // ── Celebration modal ────────────────────────────────────────────────────
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

  // Fire the celebration modal exactly once per user when all modules are done.
  // Key is per-user so switching accounts works correctly.
  useEffect(() => {
    if (isLoading) return;
    if (liveModules.length === 0) return;
    if (completedCount < liveModules.length) return;

    const key = `aapstart:celebrated:${user?.employee_id ?? "guest"}`;
    if (localStorage.getItem(key)) return;

    // Small delay so the page renders first
    const t = setTimeout(() => setShowCelebration(true), 600);
    return () => clearTimeout(t);
  }, [isLoading, completedCount, liveModules.length, user?.employee_id]);

  const isModuleUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevSlug = liveModules[index - 1].slug;
    return progressMap.get(prevSlug)?.module_completed ?? false;
  };

  const nextToUnlockIndex = liveModules.findIndex((_, i) => !isModuleUnlocked(i));

  // Change 1: pick a rotating coach tip
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
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <p className="text-[1rem] font-semibold text-red-600">Could not connect to the server</p>
        <p className="text-[0.82rem] text-text-muted max-w-sm">{loadError.message}</p>
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
    // Change 2: w-full with no max-width so siderail reaches true far right
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">

      {/* Completion celebration modal */}
      {showCelebration && (
        <CelebrationModal
          name={user?.full_name ?? firstName}
          completedCount={completedCount}
          onClose={handleCloseCelebration}
        />
      )}

      {/* Hero — full width */}
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

      {/* Journey + right siderail */}
      <div className="flex items-start gap-5">

        {/* ── Left: journey list ── */}
        <div className="min-w-0 flex-1 animate-fade-up" style={{ animationDelay: "60ms" }}>

          {/* Change 9: section heading with rocket icon */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[1.1rem] leading-none">🚀</span>
            <div>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-text-muted">
                Your Launch Path
              </p>
              <h2 className="mt-0.5 text-[1.2rem] font-extrabold tracking-[-0.02em] text-text-primary">
                {firstName}&apos;s learning journey
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            {liveModules.map((module, index) => {
              const prog = progressMap.get(module.slug);
              const isComplete = prog?.module_completed ?? false;
              const isInProgress = !isComplete && (prog?.visited || prog?.acknowledgements_completed || prog?.quiz_passed);
              const isCurrent = module.slug === currentModule?.slug;
              const unlocked = isModuleUnlocked(index);
              const isNextToUnlock = index === nextToUnlockIndex;

              // ── Change 7: Locked module — dramatic "Up Next" glow ──
              if (!unlocked) {
                return (
                  <div
                    key={module.slug}
                    className="flex gap-4 rounded-[16px] p-5"
                    style={
                      isNextToUnlock
                        ? {
                            backgroundColor: "#f0f7ff",
                            border: "1.5px solid rgba(14,118,189,0.35)",
                            boxShadow: "0 0 0 3px rgba(14,118,189,0.06), 0 2px 12px rgba(14,118,189,0.09)",
                          }
                        : {
                            backgroundColor: "#f7f3ee",
                            border: "1px solid rgba(0,0,0,0.05)",
                            opacity: 0.5,
                          }
                    }
                  >
                    {/* Lock / unlock icon */}
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full",
                          isNextToUnlock ? "animate-pulse" : ""
                        )}
                        style={{
                          backgroundColor: isNextToUnlock ? "rgba(14,118,189,0.15)" : "rgba(0,0,0,0.06)",
                        }}
                      >
                        <svg width="11" height="12" viewBox="0 0 10 11" fill="none" className={isNextToUnlock ? "text-brand-bright" : "text-gray-400"}>
                          <rect x="1" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M3 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className="text-[0.93rem] font-semibold leading-snug"
                          style={{ color: isNextToUnlock ? "#0f1d3c" : "#9ca3af" }}
                        >
                          {module.title}
                        </p>
                        {/* Change 7: vivid "Up Next" badge vs plain "Locked" */}
                        {isNextToUnlock ? (
                          <span
                            className="shrink-0 rounded-[6px] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                            style={{ backgroundColor: "rgba(14,118,189,0.13)", color: "#0e76bd" }}
                          >
                            🔓 Up Next
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-[6px] bg-gray-100 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-gray-400">
                            Locked
                          </span>
                        )}
                      </div>
                      {module.description && (
                        <p
                          className="mt-1 line-clamp-2 text-[0.78rem] leading-[1.55]"
                          style={{ color: isNextToUnlock ? "#4b5563" : "#9ca3af" }}
                        >
                          {module.description}
                        </p>
                      )}
                      {isNextToUnlock && (
                        <p className="mt-2 text-[0.72rem] font-semibold" style={{ color: "#0e76bd" }}>
                          Finish the current module to unlock this one ✨
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              // ── Unlocked module ──
              return (
                <Link
                  key={module.slug}
                  href={`/modules/${module.slug}`}
                  className="group flex gap-4 rounded-[16px] p-5 transition-all duration-150 hover:-translate-y-px"
                  style={{
                    backgroundColor: "#f9fafb",
                    boxShadow: isCurrent
                      ? "0 2px 16px rgba(14,118,189,0.14), 0 1px 4px rgba(0,0,0,0.06)"
                      : isComplete
                        ? "0 1px 8px rgba(34,197,94,0.12)"
                        : "0 1px 6px rgba(0,0,0,0.06)",
                    borderLeft: isComplete
                      ? "3px solid #22c55e"
                      : isCurrent
                        ? "3px solid #0e76bd"
                        : "3px solid transparent",
                  }}
                >
                  {/* Status circle */}
                  <div className="mt-0.5 shrink-0">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[0.62rem] font-bold"
                      style={
                        isComplete
                          ? { backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e" }
                          : isCurrent
                            ? { backgroundColor: "rgba(14,118,189,0.12)", color: "#0e76bd" }
                            : { backgroundColor: "#f3f4f6", color: "#9ca3af" }
                      }
                    >
                      {isComplete ? (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6.5l2.5 2.5L10 3" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn("text-[0.93rem] font-semibold leading-snug", isComplete ? "text-text-secondary" : "text-text-primary")}>
                        {module.title}
                      </p>
                      {/* Change 6: vivid badges */}
                      <div className="flex shrink-0 items-center gap-2">
                        {isComplete && <Badge variant="complete">✓ Complete</Badge>}
                        {isInProgress && !isComplete && (
                          <span
                            className="rounded-[6px] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                            style={{ backgroundColor: "rgba(14,118,189,0.13)", color: "#0e76bd" }}
                          >
                            In Progress
                          </span>
                        )}
                        {isCurrent && !isComplete && !isInProgress && (
                          <span
                            className="rounded-[6px] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                            style={{ backgroundColor: "rgba(14,118,189,0.12)", color: "#0e76bd" }}
                          >
                            Up Next
                          </span>
                        )}
                      </div>
                    </div>
                    {module.description && (
                      <p className="mt-1 line-clamp-2 text-[0.78rem] leading-[1.55] text-text-secondary">
                        {module.description}
                      </p>
                    )}
                    {isComplete && (
                      <p
                        className="mt-2 text-[0.73rem] font-semibold transition-all group-hover:underline"
                        style={{ color: "#22c55e" }}
                      >
                        Review module →
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Right siderail ── */}
        <div className="w-[295px] shrink-0 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>

          {/* Change 1: Coach Tip → warm light card, not dark navy */}
          <div
            className="overflow-hidden rounded-[16px]"
            style={{
              backgroundColor: "#fffbf2",
              border: "1px solid rgba(14,118,189,0.15)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            {/* Accent bar at top */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #0e76bd, #22c55e)" }} />
            <div className="p-5">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="text-[1rem]">💡</span>
                <span
                  className="text-[0.6rem] font-bold uppercase tracking-[0.18em]"
                  style={{ color: "#0e76bd" }}
                >
                  Coach Tip
                </span>
              </div>
              <p className="text-[0.83rem] leading-[1.65] text-text-primary">
                {coachTip}
              </p>
              <p
                className="mt-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] italic"
                style={{ color: "#0e76bd" }}
              >
                One module at a time. That&apos;s all.
              </p>
            </div>
          </div>

          {/* Change 3: Contact card — warmer, Nicole avatar */}
          <div
            className="overflow-hidden rounded-[16px]"
            style={{ backgroundColor: "#f9fafb", boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}
          >
            {/* Warm tinted header */}
            <div
              className="px-5 pt-4 pb-3"
              style={{ backgroundColor: "rgba(14,118,189,0.04)", borderBottom: "1px solid rgba(14,118,189,0.08)" }}
            >
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-text-muted">
                Your HR Support
              </p>
            </div>

            <div className="p-5">
              {/* Nicole's avatar + name */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #0e76bd, #1a2a5e)" }}
                >
                  NT
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[0.9rem] font-bold leading-tight text-text-primary">Nicole Thornton</p>
                    <span
                      className="rounded-[4px] px-1.5 py-0.5 text-[0.54rem] font-bold uppercase tracking-[0.08em]"
                      style={{ backgroundColor: "rgba(14,118,189,0.1)", color: "#0e76bd" }}
                    >
                      Primary
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.75rem] text-text-muted">HR Manager</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-text-muted">Email</p>
                  <p className="mt-0.5 text-[0.78rem] text-text-primary">nicole.thornton@apirx.com</p>
                </div>
                <div>
                  <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-text-muted">Phone</p>
                  <p className="mt-0.5 text-[0.78rem] text-text-primary">256-574-7528</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <a
                  href="mailto:nicole.thornton@apirx.com"
                  className="flex-1 rounded-[8px] py-2 text-center text-[0.73rem] font-semibold text-text-secondary transition-colors hover:bg-gray-50"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  Email Nicole
                </a>
                <a
                  href="tel:2565747528"
                  className="flex-1 rounded-[8px] py-2 text-center text-[0.73rem] font-semibold text-text-secondary transition-colors hover:bg-gray-50"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  Call Nicole
                </a>
              </div>

              <p className="mt-3 text-[0.7rem] leading-[1.5] text-text-secondary">
                Primary contact for onboarding questions, benefits timing, time-away routing, and general next-step help.
              </p>

              <div className="mt-4 pt-3" style={{ borderTop: "1px solid #f0f0f0" }}>
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-text-muted">
                  Escalation Support
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #5d9fd2, #1a2a5e)" }}
                  >
                    BH
                  </div>
                  <p className="text-[0.82rem] font-semibold text-text-primary">Brandy Hooper</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
