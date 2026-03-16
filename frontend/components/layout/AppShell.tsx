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

  const isJourneyActive = pathname === "/overview" || pathname.startsWith("/modules") || pathname === "/roadmap";
  const isResourcesActive = pathname.startsWith("/resources");
  const isRoadmapActive = pathname === "/roadmap";

  const isModuleUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevSlug = liveModules[index - 1].slug;
    return progress?.find((p) => p.module_slug === prevSlug)?.module_completed ?? false;
  };

  return (
    <div className="flex min-h-screen">
      <nav
        className="fixed bottom-0 left-0 top-0 z-40 flex w-[236px] flex-col overflow-y-auto"
        style={{
          background: "linear-gradient(182deg, #0b1f3d 0%, #12315a 54%, #193b68 100%)",
          borderRight: "1px solid rgba(133, 178, 231, 0.3)",
          boxShadow: "14px 0 28px rgba(7, 18, 36, 0.24)",
        }}
      >
        <div className="px-5 pb-4 pt-5" style={{ borderBottom: "1px solid rgba(148, 188, 236, 0.24)" }}>
          <Link href="/overview" className="block">
            <Image
              src="/logo.png"
              alt="AAP Start"
              width={170}
              height={48}
              className="h-11 w-auto"
              style={{
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.32))",
              }}
            />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-4">
          <p className="mb-2 px-2 text-[0.54rem] font-bold uppercase tracking-[0.2em] text-cyan-100/80">
            Your Journey
          </p>

          <Link
            href="/overview"
            className={cn(
              "mb-1 flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-[0.76rem] font-semibold transition-all duration-150",
              pathname === "/overview"
                ? "bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.36)]"
                : "text-slate-200 hover:bg-white/[0.1] hover:text-white"
            )}
          >
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                pathname === "/overview" ? "text-white" : "text-slate-200"
              )}
              style={
                pathname === "/overview"
                  ? { backgroundColor: "#0ea5d9" }
                  : { backgroundColor: "rgba(255,255,255,0.16)" }
              }
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
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-[10px] px-3 py-2.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", opacity: 0.72 }}
                  >
                    <span
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(56, 189, 248, 0.2)" }}
                    >
                      <svg width="8" height="9" viewBox="0 0 8 9" fill="none" style={{ color: "#8be2ff" }}>
                        <rect x="1" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2.5 4V2.5a1.5 1.5 0 013 0V4" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </span>
                    <span className="truncate text-[0.73rem] leading-tight text-slate-300/80">{m.title}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={m.slug}
                  href={`/modules/${m.slug}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-[0.76rem] font-semibold transition-all duration-150",
                    isActive
                      ? "bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.36)]"
                      : "text-slate-200 hover:bg-white/[0.1] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[0.58rem] font-bold",
                      isActive ? "text-white" : isComplete ? "text-emerald-300" : "text-slate-200"
                    )}
                    style={
                      isActive
                        ? { backgroundColor: "#0ea5d9" }
                        : isComplete
                          ? { backgroundColor: "rgba(52, 211, 153, 0.2)" }
                          : { backgroundColor: "rgba(255,255,255,0.16)" }
                    }
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
              "mt-0.5 flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-[0.76rem] font-semibold transition-all duration-150",
              isRoadmapActive
                ? "bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.36)]"
                : "text-slate-200 hover:bg-white/[0.1] hover:text-white"
            )}
          >
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                isRoadmapActive ? "text-white" : "text-slate-200"
              )}
              style={
                isRoadmapActive
                  ? { backgroundColor: "#0ea5d9" }
                  : { backgroundColor: "rgba(255,255,255,0.16)" }
              }
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
        </div>

        {user?.is_admin && (
          <div className="px-3 pb-2" style={{ borderTop: "1px solid rgba(148, 188, 236, 0.24)", paddingTop: "10px" }}>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-[0.76rem] font-semibold transition-all duration-150",
                pathname === "/admin"
                  ? "bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.36)]"
                  : "text-slate-300 hover:bg-white/[0.1] hover:text-white"
              )}
            >
              <span
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                style={
                  pathname === "/admin"
                    ? { backgroundColor: "#0ea5d9" }
                    : { backgroundColor: "rgba(255,255,255,0.16)" }
                }
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
                  className={pathname === "/admin" ? "text-white" : "text-slate-300"}
                >
                  <circle cx="6" cy="4" r="2" />
                  <path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                </svg>
              </span>
              Admin
            </Link>
          </div>
        )}

        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(148, 188, 236, 0.24)" }}>
          {user && (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0ea5d9, #1f2d60)" }}
              >
                {initials(user.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.72rem] font-semibold leading-tight text-slate-100">{user.full_name}</p>
                <button onClick={() => logout()} className="text-[0.6rem] text-slate-300 transition-colors hover:text-white">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <header
        className="fixed left-[236px] right-0 top-0 z-30 flex h-16 items-center px-6 backdrop-blur-md"
        style={{
          background: "linear-gradient(180deg, rgba(247,251,255,0.95) 0%, rgba(242,248,255,0.93) 100%)",
          borderBottom: "1px solid rgba(166, 189, 222, 0.75)",
        }}
      >
        <div
          className="absolute left-1/2 flex -translate-x-1/2 rounded-[12px] p-1"
          style={{
            background: "#e6eef9",
            border: "1px solid #c8d8ef",
            boxShadow: "0 6px 12px rgba(20, 45, 79, 0.1)",
          }}
        >
          <button
            onClick={() => router.push("/overview")}
            className={cn(
              "rounded-[9px] px-5 py-1.5 text-[0.78rem] font-semibold transition-all duration-150",
              isJourneyActive
                ? "bg-white text-[#0e1d38] shadow-[0_1px_8px_rgba(15,29,60,0.16)]"
                : "text-[#5b6d87] hover:text-[#1f365f]"
            )}
          >
            Your Journey
          </button>
          <button
            onClick={() => router.push("/resources")}
            className={cn(
              "rounded-[9px] px-5 py-1.5 text-[0.78rem] font-semibold transition-all duration-150",
              isResourcesActive
                ? "bg-white text-[#0e1d38] shadow-[0_1px_8px_rgba(15,29,60,0.16)]"
                : "text-[#5b6d87] hover:text-[#1f365f]"
            )}
          >
            Resource Hub
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-[9px] px-3 py-1.5"
            style={{
              backgroundColor: "rgba(14, 165, 233, 0.09)",
              border: "1px solid rgba(14, 165, 233, 0.22)",
            }}
          >
            <span
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(14, 165, 233, 0.14)" }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-[#1f365f]"
              >
                <path d="M7.4 1.2c.5 1.6.2 2.6-.9 3.3 1.8-.2 3 1 3 2.7 0 2-1.6 3.5-3.6 3.5S2.3 9.2 2.3 7.2c0-1.3.7-2.3 1.9-2.9.4 1 .9 1.5 1.6 1.5.7 0 1.3-.4 1.5-1.2.2-.8.2-1.8.1-3.4z" />
              </svg>
            </span>
            <span className="text-[0.8rem] font-extrabold text-[#17406f]">{completedCount}</span>
            <span className="text-[0.68rem] font-medium text-[#516886]">done</span>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0ea5d9, #1f2d60)" }}
          >
            {initials(user?.full_name ?? "")}
          </div>
        </div>
      </header>

      <div
        className="ml-[236px] mt-16 flex min-h-[calc(100vh-4rem)] flex-1 flex-col"
        style={{
          background:
            "radial-gradient(1200px 380px at 16% -8%, rgba(34,211,238,0.14) 0%, rgba(34,211,238,0) 44%), linear-gradient(180deg, #eef5ff 0%, #e8f1ff 100%)",
        }}
      >
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
