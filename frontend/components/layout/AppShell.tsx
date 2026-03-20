"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { modulesApi, progressApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ModuleSummary, ProgressRecord } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200 hover:scale-105"
      style={{
        background: "var(--toggle-bg, rgba(27,44,86,0.12))",
        border: "1px solid var(--toggle-border, rgba(130,160,194,0.5))",
      }}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--toggle-icon, #345072)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--toggle-icon, #345072)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isManagement = user?.track === "management";
  const isHR = user?.track === "hr";

  const { data: modules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  const allModules = modules ?? [];
  const liveModules = allModules
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  // Split modules into journey (non-management) and management sections
  const journeyModules = liveModules.filter((m) => !m.tracks?.includes("management"));
  const managementModules = liveModules.filter((m) => m.tracks?.includes("management"));

  // Show journey section for non-management tracks
  const showJourney = !isManagement;
  // Show management section for management and HR tracks
  const showManagementSection = isManagement || isHR;

  const completedCount = progress
    ? journeyModules.filter((m) => progress.find((p) => p.module_slug === m.slug)?.module_completed).length
    : 0;

  const isJourneyActive = pathname === "/overview" || pathname.startsWith("/modules") || pathname === "/roadmap";
  const isResourcesActive = pathname.startsWith("/resources");
  const isRoadmapActive = pathname === "/roadmap";

  const isJourneyModuleUnlocked = (index: number) => {
    if (isHR) return true;
    if (index === 0) return true;
    const prevSlug = journeyModules[index - 1].slug;
    return progress?.find((p) => p.module_slug === prevSlug)?.module_completed ?? false;
  };

  const activeNavStyle = {
    background: "var(--sidebar-active-bg)",
    border: "1px solid var(--sidebar-active-border)",
    boxShadow: "var(--sidebar-active-shadow)",
  } as const;

  return (
    <div className="flex min-h-screen">
      <nav
        className="fixed bottom-0 left-0 top-0 z-40 flex w-[248px] flex-col overflow-y-auto"
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

          {/* ── Your Journey section (warehouse, administrative, HR) ── */}
          {showJourney && (
            <details open={!isHR} className="group mt-3 [&_summary::-webkit-details-marker]:hidden">
              <summary
                className={cn("mb-2.5 flex list-none items-center justify-between px-2 text-[0.54rem] font-bold uppercase tracking-[0.17em]", isHR ? "cursor-pointer" : "cursor-default")}
                style={{ color: "var(--sidebar-label)" }}
                onClick={(e) => {
                  if (!isHR) e.preventDefault();
                }}
              >
                <span>Your Journey</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[0.5rem]" style={{ background: "var(--sidebar-icon-bg)", color: "var(--sidebar-text)" }}>
                    {journeyModules.length}
                  </span>
                  <span className={cn("text-[0.7rem] transition-transform duration-200", isHR ? "group-open:rotate-90" : "hidden")}>&gt;</span>
                </span>
              </summary>

              <div className="space-y-1">
                {journeyModules.map((m, i) => {
                  const prog = progress?.find((p) => p.module_slug === m.slug);
                  const isComplete = prog?.module_completed ?? false;
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
                        <span className="truncate text-[0.76rem] leading-tight" style={{ color: "var(--sidebar-locked-text)" }}>{m.title}</span>
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
                      <span className="truncate leading-tight">{m.title}</span>
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

          {/* ── Management Processes section (management + HR) ── */}
          {showManagementSection && managementModules.length > 0 && (
            <details open className={cn("group [&_summary::-webkit-details-marker]:hidden", showJourney ? "mt-5 border-t pt-4" : "mt-3")} style={showJourney ? { borderColor: "var(--sidebar-divider)" } : undefined}>
              <summary
                className={cn("mb-2.5 flex list-none items-center justify-between px-2 text-[0.54rem] font-bold uppercase tracking-[0.17em]", isHR ? "cursor-pointer" : "cursor-default")}
                style={{ color: "var(--sidebar-label)" }}
                onClick={(e) => {
                  if (!isHR) e.preventDefault();
                }}
              >
                <span>Management Processes</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[0.5rem]" style={{ background: "var(--sidebar-icon-bg)", color: "var(--sidebar-text)" }}>
                    {managementModules.length}
                  </span>
                  <span className={cn("text-[0.7rem] transition-transform duration-200", isHR ? "group-open:rotate-90" : "hidden")}>&gt;</span>
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
                      <span className="truncate leading-tight">{m.title}</span>
                    </Link>
                  );
                })}
              </div>
            </details>
          )}
        </div>

        {user?.is_admin && (
          <div className="px-3.5 pb-2" style={{ borderTop: "1px solid var(--sidebar-divider)", paddingTop: "10px" }}>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.79rem] font-semibold transition-all duration-200",
                pathname === "/admin" ? "shadow-[0_8px_14px_rgba(16,35,60,0.16)]" : ""
              )}
              style={{
                color: pathname === "/admin" ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                ...(pathname === "/admin" ? activeNavStyle : undefined),
              }}
            >
              <span
                className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background: pathname === "/admin" ? "var(--sidebar-icon-active-bg)" : "var(--sidebar-icon-bg)",
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
                  style={{ color: pathname === "/admin" ? "var(--sidebar-icon-active-text)" : "var(--sidebar-icon-text)" }}
                >
                  <circle cx="6" cy="4" r="2" />
                  <path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                </svg>
              </span>
              Admin
            </Link>
          </div>
        )}

        <div className="px-3.5 py-4" style={{ borderTop: "1px solid var(--sidebar-divider)" }}>
          {user && (
            <div className="space-y-2.5">
              <p className="truncate px-2.5 text-center text-[0.73rem] font-semibold leading-tight" style={{ color: "var(--sidebar-user-name)" }}>{user.full_name}</p>
              <button
                onClick={() => logout()}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] px-3.5 py-2 text-[0.78rem] font-semibold transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #0f6da3, #1e3a66)",
                  border: "1px solid var(--sidebar-user-border)",
                  boxShadow: "0 2px 8px rgba(12, 24, 47, 0.15), 0 1px 3px rgba(12, 24, 47, 0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      <header
        className="fixed left-[248px] right-0 top-0 z-30 flex h-16 items-center px-6 backdrop-blur-md"
        style={{
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--header-border)",
        }}
      >
        <div
          className="absolute left-1/2 flex -translate-x-1/2 rounded-[12px] p-1"
          style={{
            background: "var(--tab-group-bg)",
            border: "1px solid var(--tab-group-border)",
            boxShadow: "var(--tab-group-shadow)",
          }}
        >
          <button
            onClick={() => router.push("/overview")}
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
            {isManagement ? "Training" : "Your Journey"}
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
        </div>

        <div className="ml-auto flex items-center gap-3">
          {!isManagement && (
            <div
              className="rounded-[10px] px-2.5 py-1 text-[0.74rem] font-semibold"
              style={{ background: "var(--badge-bg)", border: "1px solid var(--badge-border)", color: "var(--badge-text)" }}
            >
              {completedCount} complete
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div
        className="relative ml-[248px] mt-16 flex min-h-[calc(100vh-4rem)] flex-1 flex-col overflow-hidden"
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




