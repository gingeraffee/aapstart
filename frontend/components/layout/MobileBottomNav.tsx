"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import { useSidebarData } from "@/lib/hooks/useSidebarData";
import { MobileNavSheet } from "./MobileNavSheet";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { effectiveTrack, isPreviewing, setPreviewTrack } = usePreview();
  const {
    journeyModules,
    managementModules,
    showJourney,
    showManagementSection,
    isManagement,
    isJourneyModuleUnlocked,
    completedCount,
  } = useSidebarData();

  const [modulesOpen, setModulesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const progress = useSidebarData().progress;

  const isLearningProgramPage = pathname.startsWith("/learning-program");
  const isManagementGuidesPage = pathname.startsWith("/management-guides");
  const isHomeActive = pathname === "/overview" || isLearningProgramPage;
  const isModulesActive = pathname.startsWith("/modules");
  const isResourcesActive = pathname.startsWith("/resources") || isManagementGuidesPage;

  const activeNavStyle = {
    background: "var(--sidebar-active-bg)",
    border: "1px solid var(--sidebar-active-border)",
    boxShadow: "var(--sidebar-active-shadow)",
  } as const;

  const tabs = [
    {
      label: "Home",
      active: isHomeActive,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5V21H15v-5H9v5H3V10.5z" />
        </svg>
      ),
      onClick: () => router.push(isLearningProgramPage ? "/learning-program" : "/overview"),
    },
    {
      label: "Modules",
      active: isModulesActive || modulesOpen,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      ),
      onClick: () => { setMoreOpen(false); setModulesOpen((v) => !v); },
    },
    {
      label: "Resources",
      active: isResourcesActive,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z" />
        </svg>
      ),
      onClick: () => router.push(isManagementGuidesPage ? "/management-guides" : "/resources"),
    },
    {
      label: "More",
      active: moreOpen,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      ),
      onClick: () => { setModulesOpen(false); setMoreOpen((v) => !v); },
    },
  ];

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around md:hidden"
        style={{
          background: "var(--sidebar-bg)",
          borderTop: "1px solid var(--sidebar-border)",
          paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={tab.onClick}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pt-2.5 pb-1.5 transition-colors"
            style={{
              color: tab.active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
            }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-all"
              style={{
                background: tab.active ? "var(--sidebar-icon-active-bg)" : "transparent",
                color: tab.active ? "var(--sidebar-icon-active-text)" : "var(--sidebar-text)",
              }}
            >
              {tab.icon}
            </span>
            <span className="text-[0.6rem] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Modules sheet */}
      <MobileNavSheet open={modulesOpen} onClose={() => setModulesOpen(false)} title={showJourney ? "Your Journey" : "Modules"}>
        {showJourney && (
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
                    className="flex cursor-not-allowed items-center gap-3 rounded-[11px] px-3.5 py-3"
                  >
                    <span
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "var(--sidebar-locked-icon-bg)" }}
                    >
                      <svg width="9" height="10" viewBox="0 0 8 9" fill="none" style={{ color: "var(--sidebar-locked-icon-text)" }}>
                        <rect x="1" y="4" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2.5 4V2.5a1.5 1.5 0 013 0V4" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </span>
                    <span className="text-[0.82rem] leading-tight" style={{ color: "var(--sidebar-locked-text)" }}>{m.title}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={m.slug}
                  href={`/modules/${m.slug}`}
                  onClick={() => setModulesOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-[0.85rem] font-semibold transition-all",
                    isActive ? "shadow-[0_4px_10px_rgba(16,35,60,0.12)]" : ""
                  )}
                  style={{
                    color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                    ...(isActive ? activeNavStyle : undefined),
                  }}
                >
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold"
                    style={{
                      color: isActive ? "var(--sidebar-icon-active-text)" : isComplete ? "var(--sidebar-complete-icon-text)" : "var(--sidebar-icon-text)",
                      background: isActive ? "var(--sidebar-icon-active-bg)" : isComplete ? "var(--sidebar-complete-icon-bg)" : "var(--sidebar-icon-bg)",
                    }}
                  >
                    {isComplete ? (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        )}

        {showManagementSection && managementModules.length > 0 && (
          <>
            {showJourney && (
              <div className="my-3 h-px" style={{ background: "var(--sidebar-divider)" }} />
            )}
            <p
              className="mb-2 px-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--sidebar-label)" }}
            >
              Management Processes
            </p>
            <div className="space-y-1">
              {managementModules.map((m) => {
                const isActive = pathname.startsWith(`/modules/${m.slug}`);
                return (
                  <Link
                    key={m.slug}
                    href={`/modules/${m.slug}`}
                    onClick={() => setModulesOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-[0.85rem] font-semibold transition-all",
                      isActive ? "shadow-[0_4px_10px_rgba(16,35,60,0.12)]" : ""
                    )}
                    style={{
                      color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                      ...(isActive ? activeNavStyle : undefined),
                    }}
                  >
                    <span
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
                      style={{
                        color: isActive ? "var(--sidebar-icon-active-text)" : "var(--sidebar-icon-text)",
                        background: isActive ? "var(--sidebar-icon-active-bg)" : "var(--sidebar-icon-bg)",
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h8M2 6h8M2 9h5" />
                      </svg>
                    </span>
                    <span className="leading-tight">{m.title}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </MobileNavSheet>

      {/* More sheet */}
      <MobileNavSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Settings">
        <div className="space-y-4">
          {/* Completion count */}
          {!isManagement && (
            <div
              className="flex items-center gap-3 rounded-[12px] px-4 py-3 text-[0.85rem] font-semibold"
              style={{
                background: "var(--badge-bg)",
                border: "1px solid var(--badge-border)",
                color: "var(--badge-text)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {completedCount} module{completedCount !== 1 ? "s" : ""} complete
            </div>
          )}

          {/* User info & sign out */}
          {user && (
            <div className="space-y-3 pt-2" style={{ borderTop: "1px solid var(--sidebar-divider)" }}>
              <p
                className="px-1 text-center text-[0.8rem] font-semibold"
                style={{ color: "var(--sidebar-user-name)" }}
              >
                {user.full_name}
              </p>
              <button
                onClick={() => { setMoreOpen(false); logout(); }}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[0.82rem] font-semibold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #0f6da3, #1e3a66)",
                  border: "1px solid var(--sidebar-user-border)",
                  boxShadow: "0 2px 8px rgba(12, 24, 47, 0.15)",
                }}
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
      </MobileNavSheet>
    </>
  );
}
