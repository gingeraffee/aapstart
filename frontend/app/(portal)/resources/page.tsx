"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { resourcesApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { Resource, ResourceCategory } from "@/lib/types";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 2.5H2a1 1 0 00-1 1V12a1 1 0 001 1h8.5a1 1 0 001-1V8.5" />
      <path d="M8.5 1.5h4m0 0v4m0-4L6 8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.5v7m0 0L4.5 6m2.5 2.5L9.5 6" />
      <path d="M1.5 10v1.5A1 1 0 002.5 12.5h9a1 1 0 001-1V10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3 3" />
    </svg>
  );
}

// ── Category icon mapping ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  "quick-links": { bg: "rgba(14,118,189,0.12)", icon: "#0e76bd" },
  "policies":    { bg: "rgba(99,102,241,0.12)", icon: "#6366f1" },
  "forms":       { bg: "rgba(16,185,129,0.12)", icon: "#10b981" },
  "hr-systems":  { bg: "rgba(245,158,11,0.12)", icon: "#f59e0b" },
};

// ── Resource card ─────────────────────────────────────────────────────────────

function ResourceCard({ resource }: { resource: Resource }) {
  const [downloading, setDownloading] = useState(false);
  const colors = CATEGORY_COLORS[resource.category] ?? { bg: "rgba(14,118,189,0.12)", icon: "#0e76bd" };

  async function handleDownload() {
    if (!resource.filename) return;
    setDownloading(true);
    try {
      await resourcesApi.download(resource.filename, resource.filename);
    } catch {
      alert("File not available yet. Check back soon.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl bg-white p-5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      {/* Icon */}
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: colors.bg }}
      >
        <span style={{ color: colors.icon }}>
          {resource.type === "link" ? <ExternalLinkIcon /> : <DownloadIcon />}
        </span>
      </div>

      {/* Text */}
      <p className="mb-1 text-[0.88rem] font-semibold text-slate-800 leading-snug">{resource.title}</p>
      <p className="mb-4 flex-1 text-[0.78rem] text-slate-500 leading-relaxed">{resource.description}</p>

      {/* Action */}
      {resource.type === "link" ? (
        <a
          href={resource.url}
          target={resource.url?.startsWith("/") ? "_self" : "_blank"}
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[0.78rem] font-semibold transition-all duration-150"
          style={{ backgroundColor: colors.bg, color: colors.icon }}
        >
          Open
          <ExternalLinkIcon />
        </a>
      ) : (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[0.78rem] font-semibold transition-all duration-150 disabled:opacity-60"
          style={{ backgroundColor: colors.bg, color: colors.icon }}
        >
          {downloading ? "Downloading…" : "Download"}
          {!downloading && <DownloadIcon />}
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResourceHubPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetcher = useCallback(
    () => resourcesApi.list(
      activeCategory !== "all" ? activeCategory : undefined,
      debouncedQuery || undefined
    ) as Promise<Resource[]>,
    [activeCategory, debouncedQuery]
  );

  const swrKey = `resources:${activeCategory}:${debouncedQuery}`;
  const { data: resources, isLoading: loadingResources } = useSWR(swrKey, fetcher);
  const { data: categories } = useSWR("resource-categories", () => resourcesApi.categories() as Promise<ResourceCategory[]>);

  const allCategories: ResourceCategory[] = [{ id: "all", label: "All" }, ...(categories ?? [])];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[1.5rem] font-bold text-slate-800 leading-tight">Resource Hub</h1>
        <p className="mt-1 text-[0.88rem] text-slate-500">
          Quick links, downloadable documents, and guides — all in one place.
        </p>
      </div>

      {/* Search + filter row */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search resources…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-[0.84rem] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition-all duration-150",
                activeCategory === cat.id
                  ? "bg-brand-bright text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              )}
              style={activeCategory !== cat.id ? { border: "1px solid rgba(0,0,0,0.09)" } : undefined}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resource grid */}
      {loadingResources ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !resources || resources.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-[0.9rem] font-semibold text-slate-500">No resources found</p>
          {debouncedQuery && (
            <p className="mt-1 text-[0.8rem] text-slate-400">
              Try a different search term or clear the filter.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </div>
  );
}
