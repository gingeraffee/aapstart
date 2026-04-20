"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/context/AuthContext";
import type { ModuleSummary } from "@/lib/types";

type GuideFilter = "all" | "quick" | "deep";

function toneForLength(minutes: number) {
  if (minutes <= 8) {
    return {
      label: "Quick read",
      text: "#0d6b9d",
      chipBg: "rgba(14, 165, 233, 0.1)",
      chipBorder: "rgba(14, 165, 233, 0.18)",
    };
  }

  return {
    label: "Deep dive",
    text: "#8f1239",
    chipBg: "rgba(223, 0, 48, 0.07)",
    chipBorder: "rgba(223, 0, 48, 0.14)",
  };
}

export default function ManagementGuidesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GuideFilter>("all");
  const deferredQuery = useDeferredValue(query);

  const isHR = user?.tracks?.includes("hr") ?? false;

  const { data: modules, isLoading, error } = useSWR("modules", () =>
    modulesApi.list() as Promise<ModuleSummary[]>
  );

  useEffect(() => {
    if (user && !isHR) {
      router.replace("/overview");
    }
  }, [isHR, router, user]);

  const managementGuides = (modules ?? [])
    .filter((module) => module.status === "published" && module.tracks?.includes("management"))
    .sort((a, b) => a.order - b.order);

  const deferredQueryValue = deferredQuery.trim().toLowerCase();

  const filteredGuides = useMemo(() => {
    return managementGuides.filter((module) => {
      const matchesQuery =
        deferredQueryValue.length === 0 ||
        module.title.toLowerCase().includes(deferredQueryValue) ||
        module.description?.toLowerCase().includes(deferredQueryValue);

      const matchesFilter =
        filter === "all" ||
        (filter === "quick" && module.estimated_minutes <= 8) ||
        (filter === "deep" && module.estimated_minutes > 8);

      return matchesQuery && matchesFilter;
    });
  }, [deferredQueryValue, filter, managementGuides]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isHR) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-[1rem] font-semibold text-red-600">Could not load management guides</p>
        <p className="max-w-sm text-[0.82rem]" style={{ color: "var(--module-context)" }}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8">
      <section
        className="relative overflow-hidden rounded-[26px] p-7 lg:p-8"
        style={{
          background: "linear-gradient(180deg, rgba(255, 248, 250, 0.98) 0%, rgba(248, 252, 255, 0.98) 100%)",
          border: "1px solid rgba(223, 0, 48, 0.12)",
          boxShadow: "0 18px 38px rgba(18, 39, 71, 0.12)",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[4px] bg-[linear-gradient(90deg,#11264a_0%,#0ea5d9_62%,#d63964_100%)]" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border" style={{ borderColor: "rgba(214, 57, 100, 0.16)" }} />
        <div className="pointer-events-none absolute right-10 top-12 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(223,0,48,0.07)_0%,rgba(223,0,48,0)_72%)]" />

        <p
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em]"
          style={{ background: "rgba(223, 0, 48, 0.06)", color: "#8f1239" }}
        >
          <span className="h-2 w-2 rounded-full bg-[#d63964]" />
          Management Guides
        </p>
        <h1 className="mt-3 text-[clamp(1.7rem,3vw,2.35rem)] font-extrabold leading-[1.06]" style={{ color: "var(--heading-color)" }}>
          A cleaner library for manager playbooks
        </h1>
        <p className="mt-2 max-w-[760px] text-[0.9rem] leading-[1.7]" style={{ color: "var(--card-desc)" }}>
          This workspace gathers every management process guide into one calmer, searchable library so HR can jump straight to the right playbook without wading through the broader dashboard.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/overview"
            className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)", color: "#ffffff" }}
          >
            Back to HR Dashboard
          </Link>
          <Link
            href="/resources"
            className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all duration-200 hover:-translate-y-px"
            style={{ background: "rgba(223, 0, 48, 0.06)", border: "1px solid rgba(223, 0, 48, 0.14)", color: "#8f1239" }}
          >
            Open Resource Hub
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          className="rounded-[24px] p-5 lg:p-6"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "0 18px 36px rgba(17, 41, 74, 0.12)",
          }}
        >
          <p className="inline-flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#8f1239" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#d63964]" />
            What&apos;s New
          </p>
          <h2 className="mt-2 text-[1.1rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
            Coaching &amp; Corrective Action — Updated
          </h2>
          <p className="mt-2 text-[0.83rem] leading-[1.7]" style={{ color: "var(--card-desc)" }}>
            New section added: how to record corrective actions in BambooHR. Managers enter the type and details in the Corrective Action tab — HR files the signed documents. Includes a video walkthrough.
          </p>
          <Link
            href="/modules/coaching-corrective-action"
            className="mt-4 inline-flex rounded-[11px] px-3.5 py-2 text-[0.74rem] font-semibold transition-all duration-200 hover:-translate-y-px"
            style={{ background: "rgba(17, 38, 74, 0.94)", color: "#ffffff" }}
          >
            View updated guide →
          </Link>
        </div>

        <div
          className="rounded-[24px] p-5 lg:p-6"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "0 18px 36px rgba(17, 41, 74, 0.12)",
          }}
        >
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
            Library
          </p>
          <h2 className="mt-2 text-[1.1rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
            {managementGuides.length} process guides available
          </h2>
          <p className="mt-2 text-[0.83rem] leading-[1.7]" style={{ color: "var(--card-desc)" }}>
            Each guide covers a specific management process step by step — from hiring and onboarding to corrective action and offboarding. Search or filter below to find what you need.
          </p>
        </div>

        <div
          className="rounded-[24px] p-5 lg:p-6"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "0 18px 36px rgba(17, 41, 74, 0.12)",
          }}
        >
          <p className="inline-flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#0f7fb3" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5d9]" />
            Most Referenced
          </p>
          <h2 className="mt-2 text-[1.1rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
            Terminations &amp; Offboarding
          </h2>
          <p className="mt-2 text-[0.83rem] leading-[1.7]" style={{ color: "var(--card-desc)" }}>
            The most frequently accessed guide in the library. Covers BambooHR offboarding requests, immediate vs. scheduled access removal, IT task selection, and manager responsibilities.
          </p>
          <Link
            href="/modules/terminations-offboarding"
            className="mt-4 inline-flex rounded-[11px] px-3.5 py-2 text-[0.74rem] font-semibold transition-all duration-200 hover:-translate-y-px"
            style={{ background: "rgba(15, 127, 179, 0.1)", border: "1px solid rgba(15, 127, 179, 0.2)", color: "#0d6b9d" }}
          >
            View guide →
          </Link>
        </div>
      </section>

      <section className="mt-5">
        <div
          className="rounded-[24px] p-5 lg:p-6"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "0 18px 36px rgba(17, 41, 74, 0.12)",
          }}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
                Guide Filters
              </p>
              <h2 className="mt-1 text-[1.18rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
                Find the right process faster
              </h2>
            </div>
            <p className="text-[0.76rem]" style={{ color: "var(--card-desc)" }}>
              {filteredGuides.length} guide{filteredGuides.length === 1 ? "" : "s"} showing
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search management guides</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or topic"
                className="w-full rounded-[14px] px-4 py-3 text-[0.82rem] outline-none transition-all duration-200"
                style={{
                  background: "rgba(247, 250, 255, 0.95)",
                  border: "1px solid rgba(159, 183, 214, 0.55)",
                  color: "var(--heading-color)",
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Guides" },
                { id: "quick", label: "Quick Reads" },
                { id: "deep", label: "Deep Dives" },
              ].map((option) => {
                const isActive = filter === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => setFilter(option.id as GuideFilter)}
                    className="rounded-[12px] px-3.5 py-2 text-[0.75rem] font-semibold transition-all duration-200 hover:-translate-y-px"
                    style={{
                      background: isActive ? "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)" : "rgba(17, 38, 74, 0.05)",
                      border: isActive ? "1px solid rgba(17, 38, 74, 0.1)" : "1px solid rgba(159, 183, 214, 0.35)",
                      color: isActive ? "#ffffff" : "var(--heading-color)",
                      boxShadow: isActive ? "0 10px 22px rgba(17, 41, 74, 0.16)" : "none",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        className="mt-5 rounded-[24px] p-5 lg:p-6"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          boxShadow: "0 18px 36px rgba(17, 41, 74, 0.12)",
        }}
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#8f1239" }}>
              Playbook Library
            </p>
            <h2 className="mt-1 text-[1.18rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
              Management guides in one place
            </h2>
          </div>
          <p className="text-[0.78rem]" style={{ color: "var(--card-desc)" }}>
            Open any guide to view the full process module.
          </p>
        </div>

        {filteredGuides.length === 0 ? (
          <div
            className="rounded-[18px] border border-dashed px-5 py-10 text-center"
            style={{ borderColor: "rgba(159, 183, 214, 0.55)", background: "rgba(247, 250, 255, 0.7)" }}
          >
            <p className="text-[0.92rem] font-semibold" style={{ color: "var(--heading-color)" }}>
              No guides match that search yet.
            </p>
            <p className="mt-2 text-[0.8rem]" style={{ color: "var(--card-desc)" }}>
              Try a different keyword or switch back to all guides.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredGuides.map((guide, index) => {
              const tone = toneForLength(Math.max(guide.estimated_minutes, 1));

              return (
                <Link
                  key={guide.slug}
                  href={`/modules/${guide.slug}`}
                  className="group relative overflow-hidden rounded-[18px] p-5 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_16px_30px_rgba(17,41,74,0.14)]"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,252,255,0.98) 100%)",
                    border: "1px solid rgba(159, 183, 214, 0.48)",
                    boxShadow: "0 12px 24px rgba(17, 41, 74, 0.1)",
                  }}
                >
                  <span className="absolute inset-y-4 left-3 w-[2px] rounded-full bg-[linear-gradient(180deg,#11264a_0%,#0ea5d9_65%,#d63964_100%)]" />

                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>
                          Guide {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-1 text-[0.98rem] font-semibold leading-snug" style={{ color: "var(--heading-color)" }}>
                          {guide.title}
                        </h3>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold"
                        style={{ background: tone.chipBg, border: `1px solid ${tone.chipBorder}`, color: tone.text }}
                      >
                        {tone.label}
                      </span>
                    </div>

                    {guide.description && (
                      <p className="mt-2 text-[0.8rem] leading-[1.65]" style={{ color: "var(--card-desc)" }}>
                        {guide.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)" }}>
                        {Math.max(guide.estimated_minutes, 1)} min read
                      </p>
                      <p className="text-[0.73rem] font-semibold transition-all group-hover:underline" style={{ color: tone.text }}>
                        View guide -&gt;
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
