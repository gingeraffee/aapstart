"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { cn, initials, trackLabel } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: "/overview", label: "Overview" },
    { href: "/resources", label: "Resource Hub" },
  ];

  return (
    <div className="min-h-screen text-text-primary">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-brand-deep/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-[8rem] h-[22rem] w-[22rem] rounded-full bg-brand-action/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-alert/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 px-4 pt-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-[92rem] overflow-hidden rounded-[30px] border border-white/80 bg-white/[0.72] shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <Link href="/overview" className="group flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] shadow-[0_18px_36px_rgba(36,54,115,0.22)]">
                <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-white">AAP</span>
              </div>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-muted">Guided onboarding</p>
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[1.5rem] font-display text-brand-ink">AAP Start</span>
                  <span className="hidden text-caption text-text-muted sm:inline">Premium internal onboarding portal</span>
                </div>
              </div>
            </Link>

            <nav className="flex w-full flex-wrap items-center gap-2 rounded-full border border-slate-200/80 bg-slate-950/[0.03] p-1.5 lg:w-auto lg:flex-nowrap">
              {navLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-4 py-2.5 text-ui font-semibold transition-all duration-200",
                      active
                        ? "bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] text-white shadow-[0_14px_30px_rgba(36,54,115,0.18)]"
                        : "text-text-secondary hover:bg-white hover:text-text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="flex items-center gap-3 self-start lg:self-auto">
                <div className="hidden text-right sm:block">
                  <p className="text-ui font-semibold text-text-primary">{user.full_name}</p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <span className="rounded-full border border-brand-action/15 bg-brand-action/[0.08] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-action">
                      {trackLabel(user.track)}
                    </span>
                    <span className="text-caption text-text-muted">Signed in</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/[0.82] px-2.5 py-2 shadow-sm backdrop-blur-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-deep text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,54,115,0.22)]">
                    {initials(user.full_name)}
                  </div>
                  <button
                    onClick={() => logout()}
                    className="rounded-full px-3 py-1.5 text-caption font-semibold text-text-secondary hover:bg-slate-950/[0.04] hover:text-text-primary"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative px-4 pb-16 pt-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-[92rem]">{children}</div>
      </main>
    </div>
  );
}