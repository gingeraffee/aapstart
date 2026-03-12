"use client";

import { useState } from "react";
import useSWR from "swr";
import { resourcesApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { Resource, ResourceCategory } from "@/lib/types";

const SUGGESTED = ["handbook", "PTO", "benefits", "BambooHR", "safety"];

export default function ResourcesPage() {
  const [query,    setQuery]    = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const { data: categories } = useSWR("resource-categories", () => resourcesApi.categories() as Promise<ResourceCategory[]>);
  const { data: resources, isLoading } = useSWR(
    ["resources", category, query],
    () => resourcesApi.list({ category: category ?? undefined, q: query || undefined }) as Promise<Resource[]>
  );

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-up space-y-2">
          <h1 className="text-h1 text-text-primary">Resource Hub</h1>
          <p className="text-ui text-text-secondary max-w-lg">
            Your reference shelf. Find SOPs, policies, forms, and quick links — available any time.
          </p>
        </div>

        {/* Search */}
        <div className="space-y-3 animate-fade-up">
          <div className="relative max-w-lg">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources…"
              className="w-full h-10 pl-9 pr-4 rounded-md border border-border bg-surface text-text-primary text-ui placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-action/30 focus:border-brand-action transition-all"
            />
          </div>

          {/* Suggested searches */}
          {!query && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-caption text-text-muted">Try:</span>
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="text-caption text-brand-action hover:underline"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category filters */}
        {categories && categories.length > 0 && (
          <div className="flex gap-2 flex-wrap animate-fade-up">
            <button
              onClick={() => setCategory(null)}
              className={`px-3 py-1.5 rounded-full text-caption font-medium transition-all ${
                !category
                  ? "bg-brand-action text-white"
                  : "bg-background border border-border text-text-secondary hover:border-brand-action/40"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id === category ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full text-caption font-medium transition-all ${
                  category === cat.id
                    ? "bg-brand-action text-white"
                    : "bg-background border border-border text-text-secondary hover:border-brand-action/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : !resources || resources.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-text-secondary">No resources found.</p>
            {query && (
              <button onClick={() => setQuery("")} className="mt-2 text-caption text-brand-action hover:underline">
                Clear search
              </button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {resources.map((r) => (
              <ResourceRow key={r.id} resource={r} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const isDownload = resource.type === "download";

  return (
    <a
      href={
        isDownload
          ? `/api/resources/download?filename=${encodeURIComponent(resource.filename ?? "")}`
          : resource.url
      }
      target={isDownload ? undefined : "_blank"}
      rel={isDownload ? undefined : "noopener noreferrer"}
      download={isDownload || undefined}
      className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface hover:shadow-card hover:-translate-y-0.5 transition-all duration-150 group"
    >
      <span className="text-xl shrink-0">{isDownload ? "📄" : "🔗"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-ui font-medium text-text-primary group-hover:text-brand-action transition-colors">
          {resource.title}
        </p>
        {resource.description && (
          <p className="text-caption text-text-muted">{resource.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="muted">{resource.category}</Badge>
        <span className="text-caption text-text-muted">
          {isDownload ? "Download ↓" : "Open ↗"}
        </span>
      </div>
    </a>
  );
}
