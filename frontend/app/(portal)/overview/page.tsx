"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import { modulesApi, progressApi, resourcesApi, adminApi } from "@/lib/api";
import { WelcomeHeader } from "@/components/features/overview/WelcomeHeader";
import { CelebrationModal } from "@/components/features/overview/CelebrationModal";
import { Spinner } from "@/components/ui/Spinner";
import { cn, pickRandom } from "@/lib/utils";
import { COACH_TIPS } from "@/lib/coachTips";
import type { ModuleSummary, ProgressRecord, UiContent, DashboardData, Resource } from "@/lib/types";

/* ── Management Overview ─────────────────────────────────────────────────── */
function ManagementOverview({ firstName, managementModules }: { firstName: string; managementModules: ModuleSummary[] }) {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);

  const filtered = useMemo(() => {
    if (!deferred.trim()) return managementModules;
    const q = deferred.toLowerCase();
    return managementModules.filter(
      (m) => m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q),
    );
  }, [deferred, managementModules]);

  return (
    <div className="w-full px-6 py-5 font-sans lg:px-8 lg:py-7">

      {/* Hero section with gradient background */}
      <div
        className="mb-7 animate-fade-up overflow-hidden rounded-[20px] px-7 py-7"
        style={{
          background: "linear-gradient(135deg, rgba(255,248,250,0.98) 0%, rgba(248,252,255,0.98) 100%)",
          borderTop: "3px solid transparent",
          borderImage: "linear-gradient(90deg, #11264a 0%, #0ea5d9 62%, #d63964 100%) 1",
          boxShadow: "0 14px 28px rgba(17, 41, 74, 0.08)",
        }}
      >
        <div className="mb-1">
          <p
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.11em]"
            style={{ background: "rgba(223, 0, 48, 0.06)", color: "#8f1239" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#d63964" }} />
            Manager Resources
          </p>
        </div>
        <h1 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
          Welcome, {firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-[0.9rem] leading-[1.7]" style={{ color: "var(--card-desc)" }}>
          This portal contains process guides and reference materials designed to support you in your management role at AAP. Each document walks through a specific process step by step so you have a clear, consistent resource to reference when needed.
        </p>
      </div>

      {/* Search + heading */}
      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="mb-4">
          <h2 className="mb-3 text-[1.1rem] font-bold tracking-[-0.01em]" style={{ color: "var(--heading-color)" }}>
            Process Guides
          </h2>
          <div className="relative w-full sm:w-72">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="6.2" cy="6.2" r="4.7" />
              <path d="M12.5 12.5l-3-3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides..."
              className="h-9 w-full rounded-[10px] border pl-9 pr-3 text-[0.82rem] outline-none transition-all focus:ring-2"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                color: "var(--heading-color)",
                ...(search ? {} : {}),
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#0ea5d9"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,165,233,0.12)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
            />
          </div>
        </div>

        {/* Guide cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((module) => {
            return (
              <Link
                key={module.slug}
                href={`/modules/${module.slug}`}
                className="group relative overflow-hidden rounded-[16px] p-5 transition-all duration-200 hover:-translate-y-px"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 14px 32px rgba(17, 41, 74, 0.18), 0 0 0 1px rgba(14, 165, 233, 0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 14px 28px rgba(17, 41, 74, 0.12)"; }}
              >
                {/* Brand gradient left border */}
                <span
                  className="absolute inset-y-4 left-3 w-[2px] rounded-full"
                  style={{ background: "linear-gradient(180deg, #11264a 0%, #0ea5d9 62%, #d63964 100%)" }}
                />
                <div className="pl-2">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--welcome-label-text)" }}>
                      Process Guide
                    </p>
                    <p className="shrink-0 text-[0.67rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)" }}>
                      {Math.max(module.estimated_minutes, 1)} min
                    </p>
                  </div>
                  <p className="text-[0.96rem] font-semibold leading-snug" style={{ color: "var(--heading-color)" }}>{module.title}</p>
                  {module.description && (
                    <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-[1.58]" style={{ color: "var(--card-desc)" }}>{module.description}</p>
                  )}
                  <p className="mt-3 text-[0.73rem] font-semibold transition-all group-hover:underline" style={{ color: "#17365d" }}>
                    View guide &rarr;
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* No results */}
        {filtered.length === 0 && managementModules.length > 0 && (
          <div className="rounded-[16px] p-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <p className="text-[0.88rem] font-semibold" style={{ color: "var(--heading-color)" }}>No guides match &ldquo;{search}&rdquo;</p>
            <p className="mt-1 text-[0.8rem]" style={{ color: "var(--card-desc)" }}>Try a different search term.</p>
          </div>
        )}

        {managementModules.length === 0 && (
          <div className="rounded-[16px] p-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <p className="text-[0.88rem] font-semibold" style={{ color: "var(--heading-color)" }}>Process guides are being developed.</p>
            <p className="mt-1 text-[0.8rem]" style={{ color: "var(--card-desc)" }}>Check back soon for new management training materials.</p>
          </div>
        )}
      </div>

      {/* Browse Resource Hub CTA */}
      <div className="mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <Link
          href="/resources"
          className="group inline-flex items-center gap-2.5 rounded-[12px] px-5 py-3 text-[0.82rem] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(17,38,74,0.25)]"
          style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)" }}
        >
          Browse Resource Hub
          <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}

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

  const isHRAdmin = user?.track === "hr" && user?.is_admin === true;
  const { data: dashboardData } = useSWR(
    isHRAdmin ? "dashboard" : null,
    () => adminApi.dashboard() as Promise<DashboardData>
  );
  const { data: adminResources } = useSWR(
    isHRAdmin ? "admin-resources-overview" : null,
    () => resourcesApi.list() as Promise<Resource[]>
  );

  const isLoading = loadingModules || loadingProgress;
  const loadError = modulesError || progressError;

  const [showCelebration, setShowCelebration] = useState(false);
  const [journeyExpanded, setJourneyExpanded] = useState(false);
  const [mgmtExpanded, setMgmtExpanded] = useState(false);

  const progressMap = new Map<string, ProgressRecord>();
  progress?.forEach((item) => progressMap.set(item.module_slug, item));

  const allModules = modules ?? [];
  const liveModules = allModules
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  // Split into journey modules and management modules
  // When previewing as another track, filter out HR-exclusive modules but keep HR replacements
  // (slug ending in -hr that replace an [all] module, e.g. how-we-show-up-hr replaces how-we-show-up)
  const isHRReplacement = (slug: string) => slug.endsWith("-hr");
  const journeyModules = liveModules
    .filter((m) => !m.tracks?.includes("management"))
    .filter((m) => !isPreviewing || m.tracks?.includes("all") || m.tracks?.includes(effectiveTrack) || isHRReplacement(m.slug));
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
    if (isHRAdmin && !isPreviewing) return true;
    if (index === 0) return true;
    const prevSlug = journeyModules[index - 1].slug;
    return progressMap.get(prevSlug)?.module_completed ?? false;
  };

  const nextToUnlockIndex = journeyModules.findIndex((_, i) => !isJourneyModuleUnlocked(i));

  const coachTip = useMemo(() => pickRandom(COACH_TIPS), []);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const adminJourneyParticipants = dashboardData
    ? dashboardData.completion.all_complete + dashboardData.completion.in_progress + dashboardData.completion.not_started
    : 0;
  const adminActiveThisWeek = dashboardData?.recent_logins.length ?? 0;
  const adminInactiveThisWeek = dashboardData ? Math.max(dashboardData.total_employees - adminActiveThisWeek, 0) : 0;
  const adminCompletionRate = adminJourneyParticipants > 0 && dashboardData
    ? Math.round((dashboardData.completion.all_complete / adminJourneyParticipants) * 100)
    : 0;
  const adminResourceCount = adminResources?.length ?? 0;
  const adminManagementEntry = "/management-guides";
  const adminLearningEntry = "/learning-program";
  const adminTrackMix = dashboardData
    ? Object.entries(dashboardData.by_track).sort((a, b) => b[1] - a[1])
    : [];
  const adminBestModule = dashboardData && dashboardData.module_progress.length > 0
    ? dashboardData.module_progress.reduce((best, module) => {
        const bestRatio = best.total > 0 ? best.completed / best.total : -1;
        const nextRatio = module.total > 0 ? module.completed / module.total : -1;
        return nextRatio > bestRatio ? module : best;
      })
    : undefined;
  const adminLaggingModule = dashboardData && dashboardData.module_progress.length > 0
    ? dashboardData.module_progress.reduce((worst, module) => {
        const worstRatio = worst.total > 0 ? worst.completed / worst.total : Number.POSITIVE_INFINITY;
        const nextRatio = module.total > 0 ? module.completed / module.total : Number.POSITIVE_INFINITY;
        return nextRatio < worstRatio ? module : worst;
      })
    : undefined;

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
      <ManagementOverview firstName={firstName} managementModules={managementModules} />
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
        {isHRAdmin ? (
          /* ── HR Admin Hero ── */
          <div
            className="relative overflow-hidden rounded-[24px] p-7 lg:p-8"
            style={{
              background: "var(--welcome-bg)",
              border: "1px solid var(--welcome-border)",
              boxShadow: "var(--welcome-shadow)",
            }}
          >
            <div className="pointer-events-none absolute -right-9 -top-9 h-28 w-28 rounded-full" style={{ border: "1px solid var(--welcome-circle-border)" }} />
            <div className="pointer-events-none absolute -right-3 top-4 h-14 w-14 rounded-full" style={{ border: "1px solid var(--welcome-circle-border-2)" }} />
            <div className="pointer-events-none absolute right-12 top-14 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(223,0,48,0.08)_0%,rgba(223,0,48,0)_72%)]" />
            <div
              className="absolute inset-x-0 top-0 h-[4px]"
              style={{ background: "linear-gradient(90deg, #0ea5d9 0%, #22d3ee 58%, #d63964 100%)" }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <p
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em]"
                style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}
              >
                <span className="h-2 w-2 rounded-full bg-[#df0030]" />
                HR Admin
              </p>
            </div>

            <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em]" style={{ color: "var(--welcome-headline)" }}>
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 max-w-[640px] text-[0.9rem] leading-[1.68]" style={{ color: "var(--welcome-body)" }}>
              Your people ops command center for onboarding, training, and manager enablement.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <div
                className="rounded-full px-4 py-2 text-[0.78rem] font-semibold"
                style={{
                  background: "linear-gradient(135deg, rgba(11, 30, 61, 0.96) 0%, rgba(17, 41, 74, 0.96) 100%)",
                  border: "1px solid rgba(56, 189, 248, 0.28)",
                  color: "#ffffff",
                  boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)",
                }}
              >
                HR Dashboard
              </div>
              <Link
                href={adminLearningEntry}
                className="rounded-full px-4 py-2 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px"
                style={{
                  background: "rgba(14, 165, 233, 0.08)",
                  border: "1px solid rgba(14, 165, 233, 0.18)",
                  color: "#0d6b9d",
                }}
              >
                Learning Program
              </Link>
              <Link
                href={adminManagementEntry}
                className="rounded-full px-4 py-2 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px"
                style={{
                  background: "rgba(223, 0, 48, 0.06)",
                  border: "1px solid rgba(223, 0, 48, 0.12)",
                  color: "#8f1239",
                }}
              >
                Management Guides
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-[0.78rem] font-medium" style={{ color: "var(--welcome-label-text)" }}>
              <span>Active this week: {adminActiveThisWeek}</span>
              <span className="text-[rgba(23,54,93,0.32)]">•</span>
              <span>Need follow-up: {dashboardData?.completion.not_started ?? 0}</span>
              <span className="text-[rgba(23,54,93,0.32)]">•</span>
              <span>Manager guides ready: {managementModules.length}</span>
            </div>
          </div>
        ) : (
          <WelcomeHeader
            name={user?.full_name ?? ""}
            headers={uiData?.rotating_headers}
            currentModule={currentModule}
            completedCount={completedCount}
            totalCount={journeyModules.length}
            comingSoonCount={comingSoonCount}
          />
        )}
      </div>

      {/* ── HR Admin Dashboard ── */}
      {isHRAdmin && dashboardData && (
        <div className="mb-8 space-y-5 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Enrolled Employees",
                value: dashboardData.total_employees,
                note: `${adminTrackMix[0]?.[1] ?? 0} in ${adminTrackMix[0]?.[0] === "hr" ? "HR" : adminTrackMix[0]?.[0] === "warehouse" ? "Warehouse" : adminTrackMix[0]?.[0] === "management" ? "Management" : "Administrative"}`,
              },
              { label: "Active This Week", value: adminActiveThisWeek, note: `${adminInactiveThisWeek} still quiet this week` },
              { label: "Completion Rate", value: `${adminCompletionRate}%`, note: `${dashboardData.completion.all_complete} fully complete` },
              { label: "Resource Library", value: adminResourceCount, note: `${managementModules.length} manager guides ready` },
            ].map((card) => (
              <div key={card.label} className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>{card.label}</p>
                <p className="mt-3 text-[2rem] font-extrabold leading-none" style={{ color: "var(--heading-color)" }}>{card.value}</p>
                <p className="mt-1 text-[0.76rem]" style={{ color: "var(--card-desc)" }}>{card.note}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.02fr,0.98fr]">
            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Needs Attention</p>
              <div className="mt-4 space-y-3">
                {[`${dashboardData.completion.not_started} employees have not started yet`, `${dashboardData.completion.in_progress} are moving through core training`, `${adminInactiveThisWeek} were inactive during the last 7 days`].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="mt-[6px] h-2 w-2 rounded-full bg-[#df0030]" />
                    <p className="text-[0.82rem] leading-[1.6]" style={{ color: "var(--welcome-label-text)" }}>{item}</p>
                  </div>
                ))}
              </div>
              <Link href="/admin" className="mt-5 inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)", color: "#ffffff" }}>
                Review Team
                <span>&rarr;</span>
              </Link>
            </div>

            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Team Operations</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/admin" className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)", color: "#ffffff" }}>
                  Open Admin Screen
                </Link>
                <Link href="/resources" className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px" style={{ background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.16)", color: "#0d6b9d" }}>
                  Resource Hub
                </Link>
              </div>
              <div className="mt-4 rounded-[16px] px-4 py-4" style={{ background: "rgba(17, 41, 74, 0.04)" }}>
                <p className="text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>Bulk imports live in the admin screen</p>
                <p className="mt-1 text-[0.76rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                  Use the import tool there to upload a spreadsheet with employee name, employee number, and track. Preview As still lives in the sidebar.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Activity Feed</p>
              <div className="mt-4 space-y-3">
                {dashboardData.recent_logins.length === 0 ? (
                  <p className="text-[0.82rem]" style={{ color: "var(--card-desc)" }}>No recent logins this week yet.</p>
                ) : (
                  dashboardData.recent_logins.slice(0, 4).map((login, index) => (
                    <div key={`${login.full_name}-${index}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>{login.full_name}</p>
                        <p className="text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
                          {login.track === "hr" ? "HR" : login.track === "warehouse" ? "Warehouse" : login.track === "management" ? "Management" : "Administrative"} track login
                        </p>
                      </div>
                      <span className="shrink-0 text-[0.72rem] font-medium" style={{ color: "var(--module-context)" }}>
                        {new Date(login.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Training Health</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em]" style={{ color: "#0d6b9d" }}>Best Completion</p>
                  <p className="mt-1 text-[0.86rem] font-semibold" style={{ color: "var(--heading-color)" }}>{adminBestModule?.title ?? "No module data yet"}</p>
                </div>
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em]" style={{ color: "#8f1239" }}>Needs a Push</p>
                  <p className="mt-1 text-[0.86rem] font-semibold" style={{ color: "var(--heading-color)" }}>{adminLaggingModule?.title ?? "No module data yet"}</p>
                </div>
                <div className="rounded-[16px] px-4 py-4" style={{ background: "rgba(14, 165, 233, 0.05)" }}>
                  <p className="text-[0.78rem] leading-[1.6]" style={{ color: "var(--welcome-label-text)" }}>
                    {dashboardData.completion.in_progress} employees are currently in motion, while {dashboardData.completion.all_complete} have finished the full journey.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Link href={adminLearningEntry} className="group rounded-[22px] p-5 transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(180deg, rgba(238, 251, 255, 0.92) 0%, rgba(247, 252, 255, 0.98) 100%)", border: "1px solid rgba(14, 165, 233, 0.16)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#0d6b9d" }}>Learning Program</p>
              <h2 className="mt-2 text-[1.08rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>Training workspace preview</h2>
              <p className="mt-2 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                {completedCount} of {journeyModules.length} modules complete. {currentModule ? `${currentModule.title} is the current next step.` : "The learning journey is wrapped."}
              </p>
              <p className="mt-4 text-[0.76rem] font-semibold group-hover:underline" style={{ color: "#0d6b9d" }}>Enter Learning Program -&gt;</p>
            </Link>

            <Link href={adminManagementEntry} className="group rounded-[22px] p-5 transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(180deg, rgba(255, 247, 249, 0.94) 0%, rgba(255, 252, 253, 0.98) 100%)", border: "1px solid rgba(223, 0, 48, 0.12)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#8f1239" }}>Management Guides</p>
              <h2 className="mt-2 text-[1.08rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>Process playbook preview</h2>
              <p className="mt-2 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                {managementModules.length} guides are available for recruiting, onboarding, employee changes, and offboarding.
              </p>
              <p className="mt-4 text-[0.76rem] font-semibold group-hover:underline" style={{ color: "#8f1239" }}>Enter Management Guides -&gt;</p>
            </Link>
          </div>
        </div>
      )}

      {/*
        <div className="mb-8 space-y-5 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Enrolled Employees",
                value: dashboardData.total_employees,
                note: `${adminTrackMix[0]?.[1] ?? 0} in ${adminTrackMix[0]?.[0] === "hr" ? "HR" : adminTrackMix[0]?.[0] === "warehouse" ? "Warehouse" : adminTrackMix[0]?.[0] === "management" ? "Management" : "Administrative"}`,
              },
              { label: "Active This Week", value: adminActiveThisWeek, note: `${adminInactiveThisWeek} still quiet this week` },
              { label: "Completion Rate", value: `${adminCompletionRate}%`, note: `${dashboardData.completion.all_complete} fully complete` },
              { label: "Resource Library", value: adminResourceCount, note: `${managementModules.length} manager guides ready` },
            ].map((card) => (
              <div key={card.label} className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>{card.label}</p>
                <p className="mt-3 text-[2rem] font-extrabold leading-none" style={{ color: "var(--heading-color)" }}>{card.value}</p>
                <p className="mt-1 text-[0.76rem]" style={{ color: "var(--card-desc)" }}>{card.note}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.02fr,0.98fr]">
            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Needs Attention</p>
              <div className="mt-4 space-y-3">
                {[`${dashboardData.completion.not_started} employees have not started yet`, `${dashboardData.completion.in_progress} are moving through core training`, `${adminInactiveThisWeek} were inactive during the last 7 days`].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="mt-[6px] h-2 w-2 rounded-full bg-[#df0030]" />
                    <p className="text-[0.82rem] leading-[1.6]" style={{ color: "var(--welcome-label-text)" }}>{item}</p>
                  </div>
                ))}
              </div>
              <Link href="/admin" className="mt-5 inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)", color: "#ffffff" }}>
                Review Team
                <span>&rarr;</span>
              </Link>
            </div>

            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Team Operations</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/admin" className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)", color: "#ffffff" }}>
                  Open Admin Screen
                </Link>
                <Link href="/resources" className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px" style={{ background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.16)", color: "#0d6b9d" }}>
                  Resource Hub
                </Link>
              </div>
              <div className="mt-4 rounded-[16px] px-4 py-4" style={{ background: "rgba(17, 41, 74, 0.04)" }}>
                <p className="text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>Bulk imports live in the admin screen</p>
                <p className="mt-1 text-[0.76rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                  Use the import tool there to upload a spreadsheet with employee name, employee number, and track. Preview As still lives in the sidebar.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Activity Feed</p>
              <div className="mt-4 space-y-3">
                {dashboardData.recent_logins.length === 0 ? (
                  <p className="text-[0.82rem]" style={{ color: "var(--card-desc)" }}>No recent logins this week yet.</p>
                ) : (
                  dashboardData.recent_logins.slice(0, 4).map((login, index) => (
                    <div key={`${login.full_name}-${index}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>{login.full_name}</p>
                        <p className="text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
                          {login.track === "hr" ? "HR" : login.track === "warehouse" ? "Warehouse" : login.track === "management" ? "Management" : "Administrative"} track login
                        </p>
                      </div>
                      <span className="shrink-0 text-[0.72rem] font-medium" style={{ color: "var(--module-context)" }}>
                        {new Date(login.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[20px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Training Health</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em]" style={{ color: "#0d6b9d" }}>Best Completion</p>
                  <p className="mt-1 text-[0.86rem] font-semibold" style={{ color: "var(--heading-color)" }}>{adminBestModule?.title ?? "No module data yet"}</p>
                </div>
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em]" style={{ color: "#8f1239" }}>Needs a Push</p>
                  <p className="mt-1 text-[0.86rem] font-semibold" style={{ color: "var(--heading-color)" }}>{adminLaggingModule?.title ?? "No module data yet"}</p>
                </div>
                <div className="rounded-[16px] px-4 py-4" style={{ background: "rgba(14, 165, 233, 0.05)" }}>
                  <p className="text-[0.78rem] leading-[1.6]" style={{ color: "var(--welcome-label-text)" }}>
                    {dashboardData.completion.in_progress} employees are currently in motion, while {dashboardData.completion.all_complete} have finished the full journey.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Link href={adminLearningEntry} className="group rounded-[22px] p-5 transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(180deg, rgba(238, 251, 255, 0.92) 0%, rgba(247, 252, 255, 0.98) 100%)", border: "1px solid rgba(14, 165, 233, 0.16)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#0d6b9d" }}>Learning Program</p>
              <h2 className="mt-2 text-[1.08rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>Training workspace preview</h2>
              <p className="mt-2 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                {completedCount} of {journeyModules.length} modules complete. {currentModule ? `${currentModule.title} is the current next step.` : "The learning journey is wrapped."}
              </p>
              <p className="mt-4 text-[0.76rem] font-semibold group-hover:underline" style={{ color: "#0d6b9d" }}>Enter Learning Program -&gt;</p>
            </Link>

            <Link href={adminManagementEntry} className="group rounded-[22px] p-5 transition-all duration-200 hover:-translate-y-px" style={{ background: "linear-gradient(180deg, rgba(255, 247, 249, 0.94) 0%, rgba(255, 252, 253, 0.98) 100%)", border: "1px solid rgba(223, 0, 48, 0.12)", boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)" }}>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#8f1239" }}>Management Guides</p>
              <h2 className="mt-2 text-[1.08rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>Process playbook preview</h2>
              <p className="mt-2 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                {managementModules.length} guides are available for recruiting, onboarding, employee changes, and offboarding.
              </p>
              <p className="mt-4 text-[0.76rem] font-semibold group-hover:underline" style={{ color: "#8f1239" }}>Enter Management Guides -&gt;</p>
            </Link>
          </div>
        </div>
      )}

      {false && isHRAdmin && dashboardData && (
        <div className="mb-8 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, rgba(27,44,86,0.18) 0%, rgba(14,165,233,0.12) 100%)" }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#1b2c56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="5" width="4" height="10" rx="0.5" />
                <rect x="6" y="2" width="4" height="13" rx="0.5" />
                <rect x="11" y="7" width="4" height="8" rx="0.5" />
              </svg>
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.11em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
                Team Dashboard
              </p>
            </div>
          </div>

          Team Overview and Recent Logins
          <div className="grid gap-4 md:grid-cols-2">
            Team Overview Card
            <div
              className="rounded-[16px] p-5"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
              }}
            >
              <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--module-context)" }}>
                Team Overview
              </p>
              <p className="text-[2rem] font-extrabold leading-none" style={{ color: "var(--heading-color)" }}>
                {dashboardData.total_employees}
              </p>
              <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>Total Employees</p>

              Track breakdown
              <div className="mt-4 flex flex-wrap gap-3">
                {Object.entries(dashboardData.by_track).map(([track, count]) => {
                  const label = track === "hr" ? "HR" : track === "warehouse" ? "Warehouse" : track === "administrative" ? "Admin" : "Mgmt";
                  const color = track === "hr" ? "#3b82f6" : track === "warehouse" ? "#f59e0b" : track === "management" ? "#10b981" : "#8b5cf6";
                  return (
                    <div key={track} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[0.74rem] font-semibold" style={{ color: "var(--heading-color)" }}>{label}</span>
                      <span className="text-[0.74rem]" style={{ color: "var(--card-desc)" }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              Completion breakdown
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[0.78rem]" style={{ color: "var(--heading-color)" }}>
                    <span className="font-semibold">{dashboardData.completion.all_complete}</span> completed all modules
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <span className="text-[0.78rem]" style={{ color: "var(--heading-color)" }}>
                    <span className="font-semibold">{dashboardData.completion.in_progress}</span> in progress
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="text-[0.78rem]" style={{ color: "var(--heading-color)" }}>
                    <span className="font-semibold">{dashboardData.completion.not_started}</span> not started
                  </span>
                </div>
              </div>
            </div>

            Recent Logins Card
            <div
              className="rounded-[16px] p-5"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
              }}
            >
              <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--module-context)" }}>
                Recent Logins — Last 7 Days
              </p>

              {dashboardData.recent_logins.length === 0 ? (
                <p className="text-[0.82rem]" style={{ color: "var(--card-desc)" }}>No logins in the last 7 days.</p>
              ) : (
                <div className="space-y-2.5">
                  {dashboardData.recent_logins.slice(0, 8).map((login, i) => {
                    const loginDate = new Date(login.last_login_at);
                    const now = new Date();
                    const diffMs = now.getTime() - loginDate.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const timeLabel = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : loginDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const trackColor = login.track === "hr" ? "#3b82f6" : login.track === "warehouse" ? "#f59e0b" : login.track === "management" ? "#10b981" : "#8b5cf6";

                    return (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: trackColor }} />
                          <span className="truncate text-[0.82rem] font-medium" style={{ color: "var(--heading-color)" }}>{login.full_name}</span>
                        </div>
                        <span className="shrink-0 text-[0.74rem]" style={{ color: "var(--card-desc)" }}>{timeLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 rounded-lg px-3 py-2" style={{ background: "rgba(14, 165, 233, 0.06)" }}>
                <p className="text-[0.78rem] font-semibold" style={{ color: "var(--status-progress)" }}>
                  {dashboardData.recent_logins.length} of {dashboardData.total_employees} active this week
                </p>
              </div>
            </div>
          </div>

          Module Progress
          {dashboardData.module_progress.length > 0 && (
            <div
              className="mt-4 rounded-[16px] p-5"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 14px 28px rgba(17, 41, 74, 0.12)",
              }}
            >
              <p className="mb-4 text-[0.62rem] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--module-context)" }}>
                Module Completion
              </p>
              <div className="space-y-3">
                {dashboardData.module_progress.map((mod) => {
                  const pct = mod.total > 0 ? Math.round((mod.completed / mod.total) * 100) : 0;
                  return (
                    <div key={mod.module_slug}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="truncate text-[0.82rem] font-medium" style={{ color: "var(--heading-color)" }}>{mod.title}</span>
                        <span className="shrink-0 text-[0.74rem] font-semibold" style={{ color: "var(--card-desc)" }}>
                          {mod.completed}/{mod.total}
                        </span>
                      </div>
                      <div className="h-[4px] overflow-hidden rounded-full" style={{ background: "var(--welcome-progress-track)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100
                              ? "linear-gradient(90deg, #34d399 0%, #1fa37d 100%)"
                              : "linear-gradient(90deg, #22d3ee 0%, #0ea5d9 100%)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          Divider between dashboard and journey
          <div className="mt-6 mb-2 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, var(--card-border) 20%, var(--card-border) 80%, transparent 100%)" }} />
        </div>
      */}

      {!isHRAdmin && <div className="flex items-start gap-5 max-[1220px]:flex-col">
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
            {isHRAdmin && (
              <button
                onClick={() => setJourneyExpanded(!journeyExpanded)}
                className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.76rem] font-semibold transition-all hover:bg-black/5"
                style={{ color: "var(--status-progress)" }}
              >
                {journeyExpanded ? "Collapse" : "Expand"}
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${journeyExpanded ? "rotate-180" : ""}`}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" />
                </svg>
              </button>
            )}
          </div>

          <div className={`space-y-3.5 ${isHRAdmin && !journeyExpanded ? "hidden" : ""}`}>
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
          {isHRAdmin && managementModules.length > 0 && (
            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2.5">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.11em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
                    Manager Resources
                  </p>
                  <h2 className="mt-0.5 text-[1.22rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
                    Management Processes
                  </h2>
                </div>
                {isHRAdmin && (
                  <button
                    onClick={() => setMgmtExpanded(!mgmtExpanded)}
                    className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.76rem] font-semibold transition-all hover:bg-black/5"
                    style={{ color: "var(--status-progress)" }}
                  >
                    {mgmtExpanded ? "Collapse" : "Expand"}
                    <svg
                      width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      className={`transition-transform duration-200 ${mgmtExpanded ? "rotate-180" : ""}`}
                    >
                      <path d="M3 4.5L6 7.5L9 4.5" />
                    </svg>
                  </button>
                )}
              </div>

              <div className={`grid gap-4 sm:grid-cols-2 ${isHRAdmin && !mgmtExpanded ? "hidden" : ""}`}>
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
      </div>}
    </div>
  );
}
