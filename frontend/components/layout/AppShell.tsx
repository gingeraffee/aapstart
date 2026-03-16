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

  const activeNavStyle = {
    background: "linear-gradient(180deg, rgba(247,251,255,0.98) 0%, rgba(237,246,255,0.96) 100%)",
    border: "1px solid rgba(112, 176, 235, 0.72)",
    boxShadow: "inset 3px 0 0 #0ea5d9, inset 0 -1px 0 rgba(223,0,48,0.18), 0 10px 18px rgba(16,35,60,0.16)",
  } as const;

  return (
    <div className="flex min-h-screen">
      <nav
        className="fixed bottom-0 left-0 top-0 z-40 flex w-[248px] flex-col overflow-y-auto"
        style={{
          background: "linear-gradient(182deg, #d6e2f2 0%, #cad8eb 56%, #bfcee4 100%)",
          borderRight: "1px solid rgba(126, 155, 190, 0.78)",
          boxShadow: "10px 0 24px rgba(12, 31, 58, 0.17)",
        }}
      >
        <div
          className="px-5 pb-4 pt-4"
          style={{
            borderBottom: "1px solid rgba(153, 182, 218, 0.68)",
            background: "linear-gradient(180deg, rgba(248,252,255,0.92) 0%, rgba(237,244,252,0.94) 100%)",
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
          <p className="mb-2.5 px-2 text-[0.54rem] font-bold uppercase tracking-[0.17em] text-[#406286]">
            Your Journey
          </p>

          <Link
            href="/overview"
            className={cn(
              "mb-1.5 flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
              pathname === "/overview"
                ? "text-[#0a2240] shadow-[0_8px_14px_rgba(16,35,60,0.16)]"
                : "text-[#18395e] hover:bg-white/74 hover:text-[#0f2442]"
            )}
            style={pathname === "/overview" ? activeNavStyle : undefined}
          >
            <span
              className={cn(
                "flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition-all",
                pathname === "/overview" ? "text-[#0a7fbb]" : "text-[#2f537d]"
              )}
              style={
                pathname === "/overview"
                  ? { background: "linear-gradient(135deg, rgba(34,211,238,0.28) 0%, rgba(14,165,233,0.18) 100%)" }
                  : { backgroundColor: "rgba(40, 74, 116, 0.14)" }
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

          <div className="space-y-1">
            {liveModules.map((m, i) => {
              const prog = progress?.find((p) => p.module_slug === m.slug);
              const isComplete = prog?.module_completed ?? false;
              const isActive = pathname.startsWith(`/modules/${m.slug}`);
              const unlocked = isModuleUnlocked(i);

              if (!unlocked) {
                return (
                  <div
                    key={m.slug}
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-[11px] px-3.5 py-2.5"
                    style={{
                      backgroundColor: "rgba(250, 253, 255, 0.7)",
                      border: "1px solid rgba(166, 191, 220, 0.56)",
                    }}
                  >
                    <span
                      className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(130, 160, 194, 0.22)" }}
                    >
                      <svg width="8" height="9" viewBox="0 0 8 9" fill="none" style={{ color: "#5f7e9f" }}>
                        <rect x="1" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2.5 4V2.5a1.5 1.5 0 013 0V4" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </span>
                    <span className="truncate text-[0.76rem] leading-tight text-[#5e7998]">{m.title}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={m.slug}
                  href={`/modules/${m.slug}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
                    isActive
                      ? "text-[#0a2240] shadow-[0_8px_14px_rgba(16,35,60,0.16)]"
                      : "text-[#18395e] hover:bg-white/74 hover:text-[#0f2442]"
                  )}
                  style={isActive ? activeNavStyle : undefined}
                >
                  <span
                    className={cn(
                      "flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold transition-all",
                      isActive ? "text-[#0784c4]" : isComplete ? "text-[#2f8768]" : "text-[#2f537d]"
                    )}
                    style={
                      isActive
                        ? { background: "linear-gradient(135deg, rgba(34,211,238,0.28) 0%, rgba(14,165,233,0.18) 100%)" }
                        : isComplete
                          ? { backgroundColor: "rgba(52, 211, 153, 0.18)" }
                          : { backgroundColor: "rgba(40, 74, 116, 0.14)" }
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
              "mt-3 flex items-center gap-2.5 rounded-[12px] border-t border-[#b8cfe8] px-3.5 pb-2.5 pt-4 text-[0.8rem] font-semibold transition-all duration-200",
              isRoadmapActive
                ? "text-[#0a2240] shadow-[0_8px_14px_rgba(16,35,60,0.16)]"
                : "text-[#18395e] hover:bg-white/74 hover:text-[#0f2442]"
            )}
            style={isRoadmapActive ? { ...activeNavStyle, borderColor: "rgba(112, 176, 235, 0.72)" } : undefined}
          >
            <span
              className={cn(
                "flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full transition-all",
                isRoadmapActive ? "text-[#0784c4]" : "text-[#2f537d]"
              )}
              style={
                isRoadmapActive
                  ? { background: "linear-gradient(135deg, rgba(34,211,238,0.28) 0%, rgba(14,165,233,0.18) 100%)" }
                  : { backgroundColor: "rgba(40, 74, 116, 0.14)" }
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
          <div className="px-3.5 pb-2" style={{ borderTop: "1px solid rgba(153, 182, 218, 0.68)", paddingTop: "10px" }}>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-[0.79rem] font-semibold transition-all duration-200",
                pathname === "/admin"
                  ? "text-[#0a2240] shadow-[0_8px_14px_rgba(16,35,60,0.16)]"
                  : "text-[#18395e] hover:bg-white/74 hover:text-[#0f2442]"
              )}
              style={pathname === "/admin" ? activeNavStyle : undefined}
            >
              <span
                className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
                style={
                  pathname === "/admin"
                    ? { background: "linear-gradient(135deg, rgba(34,211,238,0.28) 0%, rgba(14,165,233,0.18) 100%)" }
                    : { backgroundColor: "rgba(40, 74, 116, 0.14)" }
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
                  className={pathname === "/admin" ? "text-[#0784c4]" : "text-[#2f537d]"}
                >
                  <circle cx="6" cy="4" r="2" />
                  <path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                </svg>
              </span>
              Admin
            </Link>
          </div>
        )}

        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(153, 182, 218, 0.68)" }}>
          {user && (
            <div className="flex items-center gap-2.5 rounded-[12px] border border-[#aec8e4] bg-white/76 px-2.5 py-2 shadow-[0_10px_16px_rgba(16,35,60,0.1)]">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0f6da3, #1e3a66)" }}
              >
                {initials(user.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.73rem] font-semibold leading-tight text-[#183555]">{user.full_name}</p>
                <button onClick={() => logout()} className="text-[0.62rem] text-[#537198] transition-colors hover:text-[#1b3658]">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <header
        className="fixed left-[248px] right-0 top-0 z-30 flex h-16 items-center px-6 backdrop-blur-md"
        style={{
          background: "linear-gradient(180deg, rgba(247,251,255,0.98) 0%, rgba(239,246,253,0.96) 100%)",
          borderBottom: "1px solid rgba(159, 188, 221, 0.84)",
        }}
      >
        <div
          className="absolute left-1/2 flex -translate-x-1/2 rounded-[12px] p-1"
          style={{
            background: "#e8f0fa",
            border: "1px solid #bdd3ec",
            boxShadow: "0 4px 10px rgba(20, 45, 79, 0.1)",
          }}
        >
          <button
            onClick={() => router.push("/overview")}
            className={cn(
              "rounded-[9px] px-5 py-1.5 text-[0.8rem] font-semibold transition-all duration-200",
              isJourneyActive
                ? "text-[#071e39] shadow-[0_1px_8px_rgba(15,29,60,0.16)]"
                : "text-[#345072] hover:text-[#1f365f]"
            )}
            style={
              isJourneyActive
                ? {
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,248,255,0.96) 100%)",
                    boxShadow: "inset 0 -2px 0 rgba(223,0,48,0.22), 0 1px 8px rgba(15,29,60,0.16)",
                  }
                : undefined
            }
          >
            Your Journey
          </button>
          <button
            onClick={() => router.push("/resources")}
            className={cn(
              "rounded-[9px] px-5 py-1.5 text-[0.8rem] font-semibold transition-all duration-200",
              isResourcesActive
                ? "text-[#071e39] shadow-[0_1px_8px_rgba(15,29,60,0.16)]"
                : "text-[#345072] hover:text-[#1f365f]"
            )}
            style={
              isResourcesActive
                ? {
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,248,255,0.96) 100%)",
                    boxShadow: "inset 0 -2px 0 rgba(223,0,48,0.22), 0 1px 8px rgba(15,29,60,0.16)",
                  }
                : undefined
            }
          >
            Resource Hub
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div
            className="rounded-[10px] px-2.5 py-1 text-[0.74rem] font-semibold text-[#134773]"
            style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.16) 0%, rgba(14,165,233,0.08) 100%)", border: "1px solid rgba(72, 188, 246, 0.42)" }}
          >
            {completedCount} complete
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0f6da3, #1e3a66)" }}
          >
            {initials(user?.full_name ?? "")}
          </div>
        </div>
      </header>

      <div
        className="relative ml-[248px] mt-16 flex min-h-[calc(100vh-4rem)] flex-1 flex-col overflow-hidden"
        style={{
          background:
            "linear-gradient(90deg, rgba(18, 45, 78, 0.08) 0%, rgba(18, 45, 78, 0) 16%, rgba(18, 45, 78, 0) 84%, rgba(18, 45, 78, 0.08) 100%), radial-gradient(1180px 500px at 48% -14%, rgba(24, 71, 119, 0.16) 0%, rgba(24, 71, 119, 0) 58%), radial-gradient(960px 420px at 85% 4%, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0) 62%), linear-gradient(180deg, #e9f1fa 0%, #f1f6fc 48%, #fbfdff 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(23, 55, 90, 0.08) 0.55px, transparent 0.7px)",
            backgroundSize: "34px 34px",
            opacity: 0.15,
            mixBlendMode: "soft-light",
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-10 h-[600px] w-[min(1080px,92%)] -translate-x-1/2 rounded-[44px]"
          style={{
            background:
              "radial-gradient(72% 82% at 50% 38%, rgba(255, 253, 249, 0.74) 0%, rgba(255, 253, 249, 0.26) 56%, rgba(255, 253, 249, 0) 100%), radial-gradient(100% 100% at 50% 0%, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0) 72%)",
          }}
        />
        <main className="relative z-10 flex-1">{children}</main>
      </div>
    </div>
  );
}
