"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import { modulesApi, progressApi, adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "./MobileBottomNav";
import { ScrollProgressBar } from "../ui/ScrollProgressBar";
import type { ModuleSummary, ProgressRecord, Track, DashboardData } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
}

const TRACK_LABELS: Record<Track, string> = {
  hr: "HR",
  administrative: "Administrative",
  warehouse: "Warehouse",
  management: "Management",
};

function ViewAsSelector() {
  const { canPreview, effectiveTrack, isPreviewing, setPreviewTrack } = usePreview();

  if (!canPreview) return null;

  return (
    <div className="mx-3.5 mb-3 mt-3.5">
      <label
        className="mb-1.5 block px-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]"
        style={{ color: "var(--sidebar-label)" }}
      >
        Preview as
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(TRACK_LABELS) as Track[]).map((track) => {
          const isSelected = effectiveTrack === track;
          const isPreviewingOther = isPreviewing && isSelected;
          return (
            <button
              key={track}
              onClick={() => setPreviewTrack(track === "hr" ? null : track)}
              className="rounded-[10px] px-2 py-2 text-[0.72rem] font-semibold text-center transition-all duration-150 cursor-pointer"
              style={{
                background: isSelected
                  ? isPreviewingOther
                    ? "rgba(15, 109, 163, 0.08)"
                    : "var(--sidebar-icon-bg)"
                  : "var(--sidebar-icon-bg)",
                border: isSelected
                  ? isPreviewingOther
                    ? "1px solid rgba(15, 109, 163, 0.35)"
                    : "1px solid var(--sidebar-active-border, rgba(130,160,194,0.4))"
                  : "1px solid transparent",
                color: isSelected
                  ? isPreviewingOther
                    ? "#0f6da3"
                    : "var(--sidebar-text)"
                  : "var(--sidebar-text)",
                opacity: isSelected ? 1 : 0.65,
              }}
            >
              {TRACK_LABELS[track]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { effectiveTrack, isPreviewing, canPreview, setPreviewTrack, previewCompletedSlugs } = usePreview();

  // Use effectiveTrack for rendering decisions
  const isManagement = effectiveTrack === "management";
  // For collapsibility, use whether the real user is HR (always true when canPreview)
  const isRealHR = canPreview;
  // For section visibility, check effectiveTrack
  const isEffectiveHR = effectiveTrack === "hr";

  const { data: modules } = useSWR(`modules:${effectiveTrack}`, () => modulesApi.list(effectiveTrack) as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);
  const { data: dashboardData } = useSWR(
    user?.is_admin ? "admin-dashboard" : null,
    () => adminApi.dashboard() as Promise<DashboardData>
  );

  const allModules = modules ?? [];
  const liveModules = allModules
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  // Split modules into journey (non-management) and management sections
  // When previewing as another track, filter out HR-exclusive modules but keep HR replacements
  const isHRReplacement = (slug: string) => slug.endsWith("-hr");
  const journeyModules = liveModules
    .filter((m) => !m.tracks?.includes("management"))
    .filter((m) => !isPreviewing || m.tracks?.includes("all") || m.tracks?.includes(effectiveTrack) || isHRReplacement(m.slug));
  const managementModules = liveModules.filter((m) => m.tracks?.includes("management"));

  // Show journey section for non-management tracks
  const showJourney = !isManagement;
  const showManagementSection = isManagement;

  const isSlugCompleted = (slug: string) =>
    (isPreviewing && previewCompletedSlugs.has(slug)) ||
    (progress?.find((p) => p.module_slug === slug)?.module_completed ?? false);

  const completedCount = journeyModules.filter((m) => isSlugCompleted(m.slug)).length;

  const isLearningProgramPage = pathname.startsWith("/learning-program");
  const isManagementGuidesPage = pathname.startsWith("/management-guides");
  const isJourneyActive = pathname === "/overview" || pathname.startsWith("/modules") || pathname === "/roadmap" || isLearningProgramPage;
  const isResourcesActive = pathname.startsWith("/resources");
  const showManagementTab = isEffectiveHR && !isManagement;
  const isRoadmapActive = pathname === "/roadmap";

  const isJourneyModuleUnlocked = (_index: number) => true;

  // Collapsibility: HR users can collapse, previewed tracks behave like their real track
  const canCollapse = isRealHR && isEffectiveHR;

  const activeNavStyle = {
    background: "var(--sidebar-active-bg)",
    border: "1px solid var(--sidebar-active-border)",
    boxShadow: "var(--sidebar-active-shadow)",
  } as const;

  return (
    <div className="flex min-h-screen">
      <ScrollProgressBar />
      <nav
        className="fixed bottom-0 left-0 top-0 z-40 hidden w-[248px] flex-col overflow-y-auto md:flex"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          boxShadow: "var(--sidebar-shadow)",
        }}
      >
        <div
          className="flex items-center justify-center px-5 pb-4 pt-4"
          style={{
            borderBottom: "1px solid var(--sidebar-logo-border)",
            background: "var(--sidebar-logo-bg)",
            boxShadow: "0 4px 12px rgba(12, 24, 47, 0.08), 0 1px 3px rgba(12, 24, 47, 0.05)",
          }}
        >
          <Link href="/overview" className="block">
            <Image
              src="/logo.png"
              alt="AAP Start"
              width={170}
              height={48}
              className="h-11 w-auto"
            />
          </Link>
        </div>

        {/* View As selector — only rendered for HR users */}
        <ViewAsSelector />

        <div className="flex-1 overflow-y-auto px-3.5 pb-3 pt-4">
          {/* Overview link for non-management tracks */}
          {!isManagement && (
          <Link
            href="/overview"
            className={cn(
              "mb-1.5 flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
              pathname === "/overview"
                ? "shadow-[0_8px_14px_rgba(16,35,60,0.16)]"
                : ""
            )}
            style={{
              color: pathname === "/overview" ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
              ...(pathname === "/overview" ? activeNavStyle : undefined),
            }}
          >
            <span
              className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition-all"
              style={{
                color: pathname === "/overview" ? "var(--sidebar-icon-active-text)" : "var(--sidebar-icon-text)",
                background: pathname === "/overview" ? "var(--sidebar-icon-active-bg)" : "var(--sidebar-icon-bg)",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 5.5L6 1l5 4.5V11H8V8H4v3H1V5.5z" />
              </svg>
            </span>
            Overview
          </Link>
          )}

          {/* Notes & Questions link */}
          <Link
            href="/notes"
            className={cn(
              "mb-1.5 flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
              pathname === "/notes"
                ? "shadow-[0_8px_14px_rgba(16,35,60,0.16)]"
                : ""
            )}
            style={{
              color: pathname === "/notes" ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
              ...(pathname === "/notes" ? activeNavStyle : undefined),
            }}
          >
            <span
              className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition-all"
              style={{
                color: pathname === "/notes" ? "var(--sidebar-icon-active-text)" : "var(--sidebar-icon-text)",
                background: pathname === "/notes" ? "var(--sidebar-icon-active-bg)" : "var(--sidebar-icon-bg)",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8.5 1.5a1.06 1.06 0 011.5 1.5L3.5 9.5H2v-1.5L8.5 1.5z" />
              </svg>
            </span>
            Notes &amp; Questions
          </Link>

          {/* ── Your Journey section (warehouse, administrative, HR) ── */}
          {showJourney && (
            <details open={!canCollapse} className="group mt-5 [&_summary::-webkit-details-marker]:hidden">
              <summary
                className={cn("mb-2.5 flex list-none items-center justify-between px-2 text-[0.54rem] font-bold uppercase tracking-[0.17em]", canCollapse ? "cursor-pointer" : "cursor-default")}
                style={{ color: "var(--sidebar-label)" }}
                onClick={(e) => {
                  if (!canCollapse) e.preventDefault();
                }}
              >
                <span>Your Journey</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[0.5rem]" style={{ background: "var(--sidebar-icon-bg)", color: "var(--sidebar-text)" }}>
                    {journeyModules.length}
                  </span>
                  <span className={cn("text-[0.7rem] transition-transform duration-200", canCollapse ? "group-open:rotate-90" : "hidden")}>&gt;</span>
                </span>
              </summary>

              <div className="space-y-1">
                {journeyModules.map((m, i) => {
                  const isComplete = isSlugCompleted(m.slug);
                  const isActive = pathname.startsWith(`/modules/${m.slug}`);
                  const unlocked = isJourneyModuleUnlocked(i);

                  if (!unlocked) {
                    return (
                      <div
                        key={m.slug}
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-[11px] px-3.5 py-2.5"
                      >
                        <span
                          className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: "var(--sidebar-locked-icon-bg)" }}
                        >
                          <svg width="8" height="9" viewBox="0 0 8 9" fill="none" style={{ color: "var(--sidebar-locked-icon-text)" }}>
                            <rect x="1" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M2.5 4V2.5a1.5 1.5 0 013 0V4" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                        </span>
                        <span className="text-[0.76rem] leading-tight" style={{ color: "var(--sidebar-locked-text)" }}>{m.title}</span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={m.slug}
                      href={`/modules/${m.slug}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
                        isActive ? "shadow-[0_8px_14px_rgba(16,35,60,0.16)]" : ""
                      )}
                      style={{
                        color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                        ...(isActive ? activeNavStyle : undefined),
                      }}
                    >
                      <span
                        className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold transition-all"
                        style={{
                          color: isActive
                            ? "var(--sidebar-icon-active-text)"
                            : isComplete
                              ? "var(--sidebar-complete-icon-text)"
                              : "var(--sidebar-icon-text)",
                          background: isActive
                            ? "var(--sidebar-icon-active-bg)"
                            : isComplete
                              ? "var(--sidebar-complete-icon-bg)"
                              : "var(--sidebar-icon-bg)",
                        }}
                      >
                        {isComplete ? (
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2 5.5l2 2L8 2.5" />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="leading-tight">{m.title}</span>
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/roadmap"
                className={cn(
                  "mt-3 flex items-center gap-2.5 rounded-[12px] px-3.5 pb-2.5 pt-4 text-[0.8rem] font-semibold transition-all duration-200",
                  isRoadmapActive ? "shadow-[0_8px_14px_rgba(16,35,60,0.16)]" : ""
                )}
                style={{
                  borderTop: "1px solid var(--sidebar-roadmap-border)",
                  color: isRoadmapActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                  ...(isRoadmapActive ? { ...activeNavStyle, borderColor: "var(--sidebar-active-border)" } : undefined),
                }}
              >
                <span
                  className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition-all"
                  style={{
                    color: isRoadmapActive ? "var(--sidebar-icon-active-text)" : "var(--sidebar-icon-text)",
                    background: isRoadmapActive ? "var(--sidebar-icon-active-bg)" : "var(--sidebar-icon-bg)",
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 2.5l3 1 3-1.5 3 1V10l-3-1-3 1.5-3-1V2.5z" />
                    <path d="M4 3.5v7M8 2v7" />
                  </svg>
                </span>
                90-Day Roadmap
              </Link>
            </details>
          )}

          {/* ── Manager Resources section (HR admins, collapsed by default) ── */}
          {showManagementTab && managementModules.length > 0 ? (
            <details className="group mt-5 border-t pt-4 [&_summary::-webkit-details-marker]:hidden" style={{ borderColor: "var(--sidebar-divider)" }}>
              <summary
                className="mb-2.5 flex cursor-pointer list-none items-center justify-between px-2 text-[0.54rem] font-bold uppercase tracking-[0.17em]"
                style={{ color: "var(--sidebar-label)" }}
              >
                <span>Manager Resources</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[0.5rem]" style={{ background: "var(--sidebar-icon-bg)", color: "var(--sidebar-text)" }}>
                    {managementModules.length}
                  </span>
                  <span className="text-[0.7rem] transition-transform duration-200 group-open:rotate-90">&gt;</span>
                </span>
              </summary>

              <div className="space-y-1">
                {managementModules.map((m) => {
                  const isActive = pathname.startsWith(`/modules/${m.slug}`);

                  return (
                    <Link
                      key={m.slug}
                      href={`/modules/${m.slug}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
                        isActive ? "shadow-[0_8px_14px_rgba(16,35,60,0.16)]" : ""
                      )}
                      style={{
                        color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                        ...(isActive ? activeNavStyle : undefined),
                      }}
                    >
                      <span
                        className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition-all"
                        style={{
                          color: isActive ? "var(--sidebar-icon-active-text)" : "var(--sidebar-icon-text)",
                          background: isActive ? "var(--sidebar-icon-active-bg)" : "var(--sidebar-icon-bg)",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 3h8M2 6h8M2 9h5" />
                        </svg>
                      </span>
                      <span className="leading-tight">{m.title}</span>
                    </Link>
                  );
                })}
              </div>
            </details>
          ) : null}

          {/* ── Management Processes section (management + HR) ── */}
          {showManagementSection && managementModules.length > 0 && (
            <details open className={cn("group [&_summary::-webkit-details-marker]:hidden", showJourney ? "mt-5 border-t pt-4" : "mt-3")} style={showJourney ? { borderColor: "var(--sidebar-divider)" } : undefined}>
              <summary
                className={cn("mb-2.5 flex list-none items-center justify-between px-2 text-[0.54rem] font-bold uppercase tracking-[0.17em]", canCollapse ? "cursor-pointer" : "cursor-default")}
                style={{ color: "var(--sidebar-label)" }}
                onClick={(e) => {
                  if (!canCollapse) e.preventDefault();
                }}
              >
                <span>Management Processes</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[0.5rem]" style={{ background: "var(--sidebar-icon-bg)", color: "var(--sidebar-text)" }}>
                    {managementModules.length}
                  </span>
                  <span className={cn("text-[0.7rem] transition-transform duration-200", canCollapse ? "group-open:rotate-90" : "hidden")}>&gt;</span>
                </span>
              </summary>

              <div className="space-y-1">
                {managementModules.map((m) => {
                  const isActive = pathname.startsWith(`/modules/${m.slug}`);

                  return (
                    <Link
                      key={m.slug}
                      href={`/modules/${m.slug}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
                        isActive ? "shadow-[0_8px_14px_rgba(16,35,60,0.16)]" : ""
                      )}
                      style={{
                        color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                        ...(isActive ? activeNavStyle : undefined),
                      }}
                    >
                      <span
                        className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition-all"
                        style={{
                          color: isActive ? "var(--sidebar-icon-active-text)" : "var(--sidebar-icon-text)",
                          background: isActive ? "var(--sidebar-icon-active-bg)" : "var(--sidebar-icon-bg)",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 3h8M2 6h8M2 9h5" />
                        </svg>
                      </span>
                      <span className="leading-tight">{m.title}</span>
                    </Link>
                  );
                })}
              </div>
            </details>
          )}

          {/* ── Team Pulse — admin-only sidebar metrics ── */}
          {user?.is_admin && dashboardData && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--sidebar-divider)" }}>
              <p
                className="mb-2.5 px-2 text-[0.54rem] font-bold uppercase tracking-[0.17em]"
                style={{ color: "var(--sidebar-label)" }}
              >
                Team Pulse
              </p>
              <div
                className="space-y-0 rounded-[12px] p-3"
                style={{
                  background: "rgba(255,255,255,0.35)",
                  border: "1px solid rgba(153,182,218,0.3)",
                }}
              >
                {/* Completion rate */}
                {(() => {
                  const total = dashboardData.total_employees || 1;
                  const completed = dashboardData.completion?.all_complete ?? 0;
                  const pct = Math.round((completed / total) * 100);
                  return (
                    <div className="pb-2.5">
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Completed</span>
                        <span className="text-[0.82rem] font-bold" style={{ color: "var(--sidebar-text)" }}>{pct}%</span>
                      </div>
                      <div className="h-[5px] w-full rounded-full" style={{ background: "var(--sidebar-icon-bg)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, #0f6da3, #38bdf8)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Active this week */}
                <div
                  className="flex items-center gap-2.5 border-t py-2.5"
                  style={{ borderColor: "rgba(153,182,218,0.25)" }}
                >
                  <span
                    className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--sidebar-icon-bg)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sidebar-icon-text)" }}>
                      <circle cx="6" cy="4" r="2" />
                      <path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.76rem] font-semibold leading-tight" style={{ color: "var(--sidebar-text)" }}>
                      {dashboardData.recent_logins?.length ?? 0} <span style={{ color: "var(--sidebar-label)" }}>/ {dashboardData.total_employees}</span>
                    </p>
                    <p className="text-[0.58rem] font-medium" style={{ color: "var(--sidebar-label)" }}>active this week</p>
                  </div>
                </div>

                {/* Needs attention */}
                <div
                  className="flex items-center gap-2.5 border-t pt-2.5"
                  style={{ borderColor: "rgba(153,182,218,0.25)" }}
                >
                  <span
                    className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: (dashboardData.completion?.not_started ?? 0) > 0
                        ? "rgba(245, 158, 11, 0.12)"
                        : "var(--sidebar-icon-bg)",
                    }}
                  >
                    {(dashboardData.completion?.not_started ?? 0) > 0 ? (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="6" cy="6" r="5" />
                        <path d="M6 4v3" />
                        <circle cx="6" cy="9" r="0.5" fill="#b45309" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sidebar-complete-icon-text, #16a34a)" }}>
                        <path d="M2 6.5l2.5 2.5L10 3" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    {(dashboardData.completion?.not_started ?? 0) > 0 ? (
                      <>
                        <p className="text-[0.76rem] font-semibold leading-tight" style={{ color: "#b45309" }}>
                          {dashboardData.completion.not_started}
                        </p>
                        <p className="text-[0.58rem] font-medium" style={{ color: "var(--sidebar-label)" }}>not started</p>
                      </>
                    ) : (
                      <p className="text-[0.72rem] font-semibold leading-tight" style={{ color: "var(--sidebar-complete-icon-text, #16a34a)" }}>
                        All on track
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Unified user footer ── */}
        <div
          className="flex items-center gap-2 px-3.5 py-3"
          style={{ borderTop: "1px solid var(--sidebar-divider)" }}
        >
          {/* Admin button (left) — only for admins */}
          {user?.is_admin && (
            <Link
              href="/admin"
              title="Admin"
              className={cn(
                "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] transition-all duration-200",
                pathname === "/admin"
                  ? "shadow-[0_4px_10px_rgba(16,35,60,0.18)]"
                  : "hover:opacity-80"
              )}
              style={{
                background: pathname === "/admin"
                  ? "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)"
                  : "var(--sidebar-icon-bg)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: pathname === "/admin" ? "#ffffff" : "var(--sidebar-icon-text)",
                }}
              >
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          )}

          {/* User name (center, fills remaining space) */}
          {user && (
            <p
              className="min-w-0 flex-1 truncate text-center text-[0.73rem] font-semibold leading-tight"
              style={{ color: "var(--sidebar-user-name)" }}
            >
              {user.full_name}
            </p>
          )}

          {/* Sign out button (right) */}
          <button
            onClick={() => logout()}
            title="Sign out"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] transition-all duration-200 hover:opacity-80"
            style={{
              background: "var(--sidebar-icon-bg)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--sidebar-icon-text)" }}
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      <MobileBottomNav />

      <header
        className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center px-4 backdrop-blur-md md:left-[248px] md:px-6"
        style={{
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--header-border)",
        }}
      >
        {/* Preview mode banner */}
        {isPreviewing && (
          <div className="mr-3 hidden items-center gap-2 rounded-[8px] px-3 py-1.5 md:flex" style={{ background: "#ffffff", border: "1px solid rgba(15, 109, 163, 0.2)", boxShadow: "0 1px 4px rgba(12, 24, 47, 0.08)" }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#0f6da3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6a5 5 0 0 1 10 0" />
              <circle cx="6" cy="6" r="1.5" />
              <path d="M6 1v1M1.5 3.5l.7.7M10.5 3.5l-.7.7" />
            </svg>
            <span className="text-[0.74rem] font-semibold" style={{ color: "var(--sidebar-text, #1b2c56)" }}>
              Previewing as {TRACK_LABELS[effectiveTrack]}
            </span>
<button
              onClick={() => setPreviewTrack(null)}
              className="ml-1 rounded px-1.5 py-0.5 text-[0.66rem] font-semibold transition-colors hover:bg-[rgba(15,109,163,0.1)]"
              style={{ color: "#0f6da3" }}
            >
              Reset
            </button>
          </div>
        )}

        <div
          className="mx-auto flex rounded-[12px] p-1 md:absolute md:left-1/2 md:mx-0 md:-translate-x-1/2"
          style={{
            background: "var(--tab-group-bg)",
            border: "1px solid var(--tab-group-border)",
            boxShadow: "var(--tab-group-shadow)",
          }}
        >
          <button
            onClick={() => router.push(isLearningProgramPage ? "/learning-program" : "/overview")}
            className={cn(
              "rounded-[9px] px-5 py-1.5 text-[0.8rem] font-semibold transition-all duration-200",
              isJourneyActive ? "shadow-[0_1px_8px_rgba(15,29,60,0.16)]" : ""
            )}
            style={{
              color: isJourneyActive ? "var(--tab-text-active)" : "var(--tab-text)",
              ...(isJourneyActive
                ? {
                    background: "var(--tab-active-bg)",
                    boxShadow: "var(--tab-active-shadow)",
                  }
                : undefined),
            }}
          >
            {isManagement ? "Training" : isLearningProgramPage ? "Learning Program" : "Your Journey"}
          </button>
          <button
            onClick={() => router.push("/resources")}
            className={cn(
              "rounded-[9px] px-5 py-1.5 text-[0.8rem] font-semibold transition-all duration-200",
              isResourcesActive ? "shadow-[0_1px_8px_rgba(15,29,60,0.16)]" : ""
            )}
            style={{
              color: isResourcesActive ? "var(--tab-text-active)" : "var(--tab-text)",
              ...(isResourcesActive
                ? {
                    background: "var(--tab-active-bg)",
                    boxShadow: "var(--tab-active-shadow)",
                  }
                : undefined),
            }}
          >
            Resource Hub
          </button>
          {showManagementTab && (
            <button
              onClick={() => router.push("/management-guides")}
              className={cn(
                "rounded-[9px] px-5 py-1.5 text-[0.8rem] font-semibold transition-all duration-200",
                isManagementGuidesPage ? "shadow-[0_1px_8px_rgba(15,29,60,0.16)]" : ""
              )}
              style={{
                color: isManagementGuidesPage ? "var(--tab-text-active)" : "var(--tab-text)",
                ...(isManagementGuidesPage
                  ? {
                      background: "var(--tab-active-bg)",
                      boxShadow: "var(--tab-active-shadow)",
                    }
                  : undefined),
              }}
            >
              Manager Resources
            </button>
          )}
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {!isManagement && (
            <div
              className="rounded-[10px] px-2.5 py-1 text-[0.74rem] font-semibold"
              style={{ background: "var(--badge-bg)", border: "1px solid var(--badge-border)", color: "var(--badge-text)" }}
            >
              {completedCount} complete
            </div>
          )}
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all duration-200 hover:opacity-80"
            style={{
              background: "var(--tab-group-bg)",
              border: "1px solid var(--tab-group-border)",
              color: "var(--tab-text)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      <div
        className="relative ml-0 mt-16 flex min-h-[calc(100vh-4rem)] flex-1 flex-col overflow-hidden pb-20 md:ml-[248px] md:pb-0"
        style={{ background: "var(--content-bg)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, var(--dot-grid-color) 0.55px, transparent 0.7px)`,
            backgroundSize: "34px 34px",
            opacity: "var(--dot-grid-opacity)",
            mixBlendMode: "soft-light",
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-10 h-[600px] w-[min(1080px,92%)] -translate-x-1/2 rounded-[44px]"
          style={{
            background: `radial-gradient(72% 82% at 50% 38%, var(--glow-bg-1) 0%, var(--glow-bg-2) 56%, rgba(255,253,249,0) 100%), radial-gradient(100% 100% at 50% 0%, var(--glow-bg-3) 0%, rgba(56,189,248,0) 72%)`,
          }}
        />
        <main className="relative z-10 flex-1">{children}</main>
      </div>
    </div>
  );
}

