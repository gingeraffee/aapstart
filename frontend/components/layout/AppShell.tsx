"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { modulesApi, progressApi } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { ModuleSummary, ProgressRecord } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const { data: modules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  const allModules = modules ?? [];
  const liveModules = allModules.filter((m) => m.status === "published");
  const comingSoonModules = allModules.filter((m) => m.status === "coming_soon");

  const completedCount = progress
    ? liveModules.filter((m) => progress.find((p) => p.module_slug === m.slug)?.module_completed).length
    : 0;
  const progressPct = liveModules.length > 0 ? Math.round((completedCount / liveModules.length) * 100) : 0;

  const overviewActive = pathname === "/overview";

  return (
    <div className="flex min-h-screen">

      {/* ── Sidebar ── */}
      <nav
        className="fixed left-0 top-0 bottom-0 z-40 flex w-[218px] flex-col overflow-y-auto"
        style={{ backgroundColor: "#0d1624", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >

        {/* Logo block */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/overview">
            <Image src="/logo.png" alt="AAP | API" width={140} height={36} className="h-9 w-auto" />
          </Link>
          <p className="mt-2.5 text-[0.52rem] font-bold uppercase tracking-[0.2em] text-slate-400">
            Employee Onboarding Portal
          </p>
          <p className="mt-0.5 text-[0.98rem] font-extrabold text-white leading-snug">AAP Start</p>
          <p className="text-[0.66rem] text-slate-400 leading-tight">American Associated Pharmacies</p>
        </div>

        {/* Tracked progress */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[0.52rem] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">
            Tracked Progress
          </p>
          <p className="text-[2rem] font-extrabold text-white leading-none">{progressPct}%</p>
          <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-slate-300">
            {completedCount} of {liveModules.length} live modules complete
          </p>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-action to-brand-sky transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Launch path */}
        <div className="px-3 pt-4 pb-3">
          <p className="mb-2 px-2 text-[0.52rem] font-bold uppercase tracking-[0.18em] text-slate-400">
            Launch Path
          </p>

          {/* Overview */}
          <Link
            href="/overview"
            className={cn(
              "relative flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.78rem] font-semibold transition-all duration-150",
              overviewActive
                ? "bg-brand-action/20 text-white"
                : "text-slate-200 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold",
                overviewActive ? "bg-brand-action text-white" : "text-slate-300"
              )}
              style={!overviewActive ? { backgroundColor: "rgba(255,255,255,0.1)" } : undefined}
            >
              0
            </span>
            Overview
          </Link>

          {/* Live modules */}
          <div className="mt-0.5 space-y-0.5">
            {liveModules.map((m, i) => {
              const prog = progress?.find((p) => p.module_slug === m.slug);
              const isComplete = prog?.module_completed ?? false;
              const isActive = pathname.startsWith(`/modules/${m.slug}`);
              return (
                <Link
                  key={m.slug}
                  href={`/modules/${m.slug}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.76rem] font-medium transition-all duration-150",
                    isActive
                      ? "bg-brand-action/20 text-white"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold",
                      isActive
                        ? "bg-brand-action text-white"
                        : isComplete
                          ? "bg-brand-sky/25 text-brand-sky"
                          : "text-slate-400"
                    )}
                    style={!isActive && !isComplete ? { backgroundColor: "rgba(255,255,255,0.1)" } : undefined}
                  >
                    {isComplete ? (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5.5l2 2L8 2.5" />
                      </svg>
                    ) : i + 1}
                  </span>
                  <span className="truncate leading-tight">{m.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Reference shelf */}
        <div className="px-3 pt-3 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="mb-2 px-2 text-[0.52rem] font-bold uppercase tracking-[0.18em] text-slate-400">
            Reference Shelf
          </p>
          <Link
            href="/resources"
            className={cn(
              "flex items-center justify-between rounded-[8px] px-2.5 py-2 text-[0.76rem] font-medium transition-all duration-150",
              pathname.startsWith("/resources")
                ? "bg-brand-action/20 text-white"
                : "text-slate-200 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            <span className="truncate">Resource Hub</span>
            <span className="ml-2 shrink-0 rounded-[4px] bg-brand-sky/20 px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.08em] text-brand-sky">
              Live
            </span>
          </Link>
        </div>

        {/* Role-specific (coming soon modules) */}
        {comingSoonModules.length > 0 && (
          <div className="px-3 pt-3 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="mb-2 px-2 text-[0.52rem] font-bold uppercase tracking-[0.18em] text-slate-400">
              Role-Specific
            </p>
            <div className="space-y-0.5">
              {comingSoonModules.map((m) => (
                <div
                  key={m.slug}
                  className="flex items-center justify-between rounded-[8px] px-2.5 py-2"
                >
                  <span className="truncate text-[0.76rem] font-medium text-slate-400 leading-tight">{m.title}</span>
                  <span
                    className="ml-2 shrink-0 rounded-[4px] px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.08em] text-slate-300"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  >
                    Soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-deep to-brand-action text-[0.68rem] font-bold text-white">
                {initials(user.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.78rem] font-semibold text-slate-100 leading-tight">
                  {user.full_name}
                </p>
                <button
                  onClick={() => logout()}
                  className="text-[0.63rem] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Main area ── */}
      <div
        className="ml-[218px] flex flex-1 flex-col min-h-screen"
        style={{ backgroundColor: "#edf0f6" }}
      >
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
