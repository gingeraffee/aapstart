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

const railItems = [
  {
    href: "/overview",
    label: "Overview",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/resources",
    label: "Resources",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 15.5v-11z" />
        <path d="M7 3v14" />
        <path d="M10 7h4" />
        <path d="M10 10h4" />
      </svg>
    ),
  },
];

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const { data: modules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  const publishedModules = (modules ?? []).filter((m) => m.status !== "draft");
  const completedCount = progress
    ? publishedModules.filter((m) => progress.find((p) => p.module_slug === m.slug)?.module_completed).length
    : 0;
  const progressPct = publishedModules.length > 0 ? Math.round((completedCount / publishedModules.length) * 100) : 0;

  return (
    <div className="flex min-h-screen">
      {/* Icon Rail */}
      <nav className="fixed left-0 top-0 bottom-0 z-40 flex w-[72px] flex-col items-center bg-brand-ink py-5">
        {/* Logo */}
        <Link href="/overview" className="mb-6 flex h-11 w-11 items-center justify-center rounded-[12px] bg-white">
          <Image src="/logo.png" alt="AAP" width={36} height={36} className="h-8 w-auto" />
        </Link>

        {/* Nav items */}
        <div className="flex flex-col items-center gap-1.5">
          {railItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-[12px] transition-all duration-200",
                  active
                    ? "bg-brand-action/20 text-white"
                    : "text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-action" />
                )}
                {item.icon}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User avatar */}
        {user && (
          <button
            onClick={() => logout()}
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-deep to-brand-action text-[0.7rem] font-bold text-white transition-all hover:opacity-80"
          >
            {initials(user.full_name)}
          </button>
        )}
      </nav>

      {/* Main area */}
      <div className="ml-[72px] flex flex-1 flex-col min-h-screen">
        {/* Page header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/[0.92] px-8 py-3 backdrop-blur-[16px]">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="AAP" width={104} height={26} className="h-[26px] w-auto" />
            <span className="h-5 w-px bg-border" />
            <span className="text-[0.92rem] font-semibold text-text-primary">Start</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[0.78rem] font-semibold text-text-muted">
              {progressPct}% complete
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
