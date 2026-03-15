"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();

  const { data: modules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  const allModules = modules ?? [];
  const liveModules = allModules
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  const completedCount = progress
    ? liveModules.filter((m) => progress.find((p) => p.module_slug === m.slug)?.module_completed).length
    : 0;

  const isJourneyActive = pathname === "/overview" || pathname.startsWith("/modules");
  const isResourcesActive = pathname.startsWith("/resources");

  const isModuleUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevSlug = liveModules[index - 1].slug;
    return progress?.find((p) => p.module_slug === prevSlug)?.module_completed ?? false;
  };

  return (
    <div className="flex min-h-screen">

      {/* ── Sidebar ── */}
      <nav
        className="fixed left-0 top-0 bottom-0 z-40 flex w-[218px] flex-col overflow-y-auto"
        style={{ background: "linear-gradient(160deg, #071e38 0%, #0a2d52 25%, #0e3a5c 50%, #0d1a2e 75%, #0c131e 100%)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/overview">
            <Image src="/logo.png" alt="AAP Start" width={160} height={82} className="h-14 w-auto" />
          </Link>
        </div>

        {/* Journey list */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 pb-3">
          <p className="mb-2 px-2 text-[0.52rem] font-bold uppercase tracking-[0.18em] text-slate-400">
            Your Journey
          </p>

          {/* Change 8: Overview uses a home icon instead of "0" circle */}
          <Link
            href="/overview"
            className={cn(
              "mb-1 flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.76rem] font-medium transition-all duration-150",
              pathname === "/overview"
                ? "bg-brand-bright/20 text-white"
                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                pathname === "/overview" ? "bg-brand-bright" : ""
              )}
              style={pathname !== "/overview" ? { backgroundColor: "rgba(255,255,255,0.1)" } : undefined}
            >
              {/* Home icon */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                className={pathname === "/overview" ? "text-white" : "text-slate-400"}
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

          {/* Modules with sequential locking */}
          <div className="space-y-0.5">
            {liveModules.map((m, i) => {
              const prog = progress?.find((p) => p.module_slug === m.slug);
              const isComplete = prog?.module_completed ?? false;
              const isActive = pathname.startsWith(`/modules/${m.slug}`);
              const unlocked = isModuleUnlocked(i);

              if (!unlocked) {
                return (
                  <div
                    key={m.slug}
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-[8px] px-2.5 py-2"
                  >
                    <span
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(14,118,189,0.12)" }}
                    >
                      <svg width="8" height="9" viewBox="0 0 8 9" fill="none" style={{ color: "#0e76bd" }}>
                        <rect x="1" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2.5 4V2.5a1.5 1.5 0 013 0V4" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </span>
                    <span className="truncate text-[0.73rem] leading-tight text-slate-400">{m.title}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={m.slug}
                  href={`/modules/${m.slug}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.76rem] font-medium transition-all duration-150",
                    isActive
                      ? "bg-brand-bright/20 text-white"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold",
                      isActive ? "bg-brand-bright text-white" : isComplete ? "text-brand-green" : "text-slate-400"
                    )}
                    style={
                      isActive
                        ? undefined
                        : isComplete
                          ? { backgroundColor: "rgba(34, 197, 94, 0.15)" }
                          : { backgroundColor: "rgba(255,255,255,0.1)" }
                    }
                  >
                    {isComplete ? (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        </div>

        {/* User / sign out */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {user && (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0e76bd, #1a2a5e)" }}
              >
                {initials(user.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.72rem] font-semibold text-slate-200 leading-tight">
                  {user.full_name}
                </p>
                <button
                  onClick={() => logout()}
                  className="text-[0.6rem] text-slate-400 transition-colors hover:text-slate-200"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Top nav ── */}
      <header
        className="fixed left-[218px] right-0 top-0 z-30 flex h-14 items-center px-6"
        style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb" }}
      >
        {/* Journey / Resource Hub toggle */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex rounded-[10px] p-1"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <button
            onClick={() => router.push("/overview")}
            className={cn(
              "rounded-[8px] px-5 py-1.5 text-[0.78rem] font-semibold transition-all duration-150",
              isJourneyActive ? "bg-white text-brand-bright shadow-sm" : "text-text-muted hover:text-text-secondary"
            )}
          >
            Your Journey
          </button>
          <button
            onClick={() => router.push("/resources")}
            className={cn(
              "rounded-[8px] px-5 py-1.5 text-[0.78rem] font-semibold transition-all duration-150",
              isResourcesActive ? "bg-white text-brand-bright shadow-sm" : "text-text-muted hover:text-text-secondary"
            )}
          >
            Resource Hub
          </button>
        </div>

        {/* Streak + avatar */}
        <div className="ml-auto flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5"
            style={{ backgroundColor: completedCount > 0 ? "#fff4e6" : "#f9fafb" }}
          >
            <span className="text-[1rem] leading-none">{completedCount > 0 ? "🔥" : "⚡"}</span>
            <span
              className="text-[0.82rem] font-extrabold"
              style={{ color: completedCount > 0 ? "#f97316" : "#6b7280" }}
            >
              {completedCount}
            </span>
            <span
              className="text-[0.68rem] font-medium"
              style={{ color: completedCount > 0 ? "#fb923c" : "#9ca3af" }}
            >
              done
            </span>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0e76bd, #1a2a5e)" }}
          >
            {initials(user?.full_name ?? "")}
          </div>
        </div>
      </header>

      {/* ── Main area ── */}
      <div
        className="ml-[218px] mt-14 flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col"
        style={{ backgroundColor: "#e8edf5" }}
      >
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
