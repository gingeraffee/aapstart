"use client";

import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { modulesApi, progressApi, resourcesApi } from "@/lib/api";
import { WelcomeHeader } from "@/components/features/overview/WelcomeHeader";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ModuleSummary, ProgressRecord, UiContent } from "@/lib/types";

export default function OverviewPage() {
  const { user } = useAuth();

  const { data: modules, isLoading: loadingModules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress, isLoading: loadingProgress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);
  const { data: uiData } = useSWR("ui", () => resourcesApi.ui() as Promise<UiContent>);

  const isLoading = loadingModules || loadingProgress;

  const progressMap = new Map<string, ProgressRecord>();
  progress?.forEach((item) => progressMap.set(item.module_slug, item));

  const allModules = modules ?? [];
  const liveModules = allModules.filter((m) => m.status === "published");
  const comingSoonCount = allModules.filter((m) => m.status === "coming_soon").length;
  const completedCount = liveModules.filter((m) => progressMap.get(m.slug)?.module_completed).length;

  const currentModule = liveModules.find(
    (m) => !progressMap.get(m.slug)?.module_completed
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="ml-0 mr-auto w-full max-w-[1100px] pl-6 pr-6 py-6 lg:pr-10 lg:py-10">
      <div className="flex gap-6 items-start">

        {/* ── Left: main content ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Hero */}
          <div className="animate-fade-up">
            <WelcomeHeader
              name={user?.full_name ?? ""}
              headers={uiData?.rotating_headers}
              currentModule={currentModule}
              completedCount={completedCount}
              totalCount={liveModules.length}
              comingSoonCount={comingSoonCount}
            />
          </div>

          {/* Journey list */}
          <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
            <div className="mb-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-text-muted">
                Tracked Path
              </p>
              <h2 className="mt-0.5 text-[1.25rem] font-extrabold tracking-[-0.02em] text-text-primary">
                {firstName}&apos;s launch journey
              </h2>
            </div>

            <div className="space-y-2">
              {liveModules.map((module, index) => {
                const prog = progressMap.get(module.slug);
                const isComplete = prog?.module_completed ?? false;
                const isInProgress = !isComplete && (prog?.visited || prog?.acknowledgements_completed || prog?.quiz_passed);
                const isCurrent = module.slug === currentModule?.slug;

                return (
                  <Link
                    key={module.slug}
                    href={`/modules/${module.slug}`}
                    className={cn(
                      "group flex gap-4 rounded-[16px] p-5 transition-all duration-150 hover:-translate-y-px",
                      isComplete ? "opacity-80" : ""
                    )}
                    style={{
                      backgroundColor: "#ffffff",
                      boxShadow: isCurrent
                        ? "0 2px 16px rgba(48,119,185,0.12), 0 1px 4px rgba(0,0,0,0.06)"
                        : "0 1px 6px rgba(0,0,0,0.06)",
                      ...(isCurrent ? { borderLeft: "3px solid #3077b9" } : {}),
                    }}
                  >
                    {/* Status circle */}
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[0.62rem] font-bold",
                          isComplete
                            ? "bg-brand-sky/15 text-brand-sky"
                            : isCurrent
                              ? "bg-brand-action/15 text-brand-action"
                              : "bg-gray-100 text-text-muted"
                        )}
                      >
                        {isComplete ? (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6.5l2.5 2.5L10 3" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={cn(
                            "font-semibold text-[0.93rem] leading-snug",
                            isComplete ? "text-text-secondary" : "text-text-primary"
                          )}
                        >
                          {module.title}
                        </p>
                        {isComplete && <Badge variant="done">Done</Badge>}
                        {isInProgress && !isComplete && <Badge variant="active">In Progress</Badge>}
                        {isCurrent && !isComplete && !isInProgress && (
                          <Badge variant="active">Up Next</Badge>
                        )}
                      </div>
                      {module.description && (
                        <p className="mt-1 text-[0.78rem] leading-[1.55] text-text-secondary line-clamp-2">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-[290px] shrink-0 space-y-4 animate-fade-up" style={{ animationDelay: "100ms" }}>

          {/* Coach Tip */}
          <div
            className="rounded-[16px] p-5"
            style={{
              background: "linear-gradient(140deg, #1a3060 0%, #0d1830 100%)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-brand-sky text-[0.6rem] font-bold uppercase tracking-[0.18em]">
                + Coach Tip
              </span>
            </div>
            <p className="text-[0.82rem] leading-[1.6] text-slate-200">
              <span className="text-brand-sky font-semibold">Did you know:</span> Most people remember more when they connect a policy to a real day-one scenario instead of trying to memorize the wording.
            </p>
            <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-brand-sky">
              One module at a time. That&apos;s all.
            </p>
          </div>

          {/* Contact card */}
          <div
            className="rounded-[16px] bg-white p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}
          >
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-text-muted mb-3">
              Questions
            </p>

            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-[0.9rem] text-text-primary leading-tight">Nicole Thornton</p>
                <p className="text-[0.75rem] text-text-muted mt-0.5">HR Manager</p>
              </div>
              <span className="shrink-0 rounded-[4px] bg-brand-action/10 px-2 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.08em] text-brand-action">
                Primary
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              <div>
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-text-secondary">Email</p>
                <p className="text-[0.78rem] text-text-primary mt-0.5">nicole.thornton@apirx.com</p>
              </div>
              <div>
                <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-text-secondary">Phone</p>
                <p className="text-[0.78rem] text-text-primary mt-0.5">256-574-7528</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href="mailto:nicole.thornton@apirx.com"
                className="flex-1 rounded-[8px] py-2 text-center text-[0.73rem] font-semibold text-text-secondary transition-colors hover:bg-gray-50"
                style={{ border: "1px solid #e5e7eb" }}
              >
                Email Nicole
              </a>
              <a
                href="tel:2565747528"
                className="flex-1 rounded-[8px] py-2 text-center text-[0.73rem] font-semibold text-text-secondary transition-colors hover:bg-gray-50"
                style={{ border: "1px solid #e5e7eb" }}
              >
                Call Nicole
              </a>
            </div>

            <p className="mt-3 text-[0.7rem] leading-[1.5] text-text-secondary">
              Primary contact for onboarding questions, benefits timing, time-away routing, and general next-step help.
            </p>

            <div className="mt-4 pt-3" style={{ borderTop: "1px solid #f0f0f0" }}>
              <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-text-secondary">
                Escalation Support
              </p>
              <p className="mt-1 text-[0.82rem] font-semibold text-text-primary">Brandy Hooper</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
