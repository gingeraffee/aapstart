"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { resourcesApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { Resource, ResourceCategory } from "@/lib/types";

const CONTACTS = [
  // HR
  {
    name: "Nicole Thornton",
    title: "HR Manager",
    phone: "256-574-7528 ext 252",
    email: "nicole.thornton@apirx.com",
    color: "#df0030",
  },
  {
    name: "Brandy Hooper",
    title: "VP of HR",
    phone: "256-574-7526 ext 226",
    email: "brandy.hooper@rxaap.com",
    color: "#1b2c56",
  },
  // Executive
  {
    name: "Tracie Heyrman",
    title: "Chief Operating Officer",
    phone: "256-808-2144",
    email: "tracie.heyrman@rxaap.com",
    color: "#1b2c56",
  },
  // IT
  {
    name: "Trevor Bowen",
    title: "IT - Scottsboro",
    phone: "256-574-6819 ext 214",
    email: "trevor.bowen@apirx.com",
    color: "#0f7fb3",
  },
  {
    name: "Phil Horton",
    title: "IT - Memphis",
    phone: "901-800-4605 ext 405",
    email: "phil.horton@apirx.com",
    color: "#0f7fb3",
  },
  {
    name: "Austin Wilson",
    title: "IT - AAP",
    phone: "256-218-5527 ext 527",
    email: "austin.wilson@rxaap.com",
    color: "#0f7fb3",
  },
  {
    name: "Dylan Willis",
    title: "IT - Memphis",
    phone: "901-800-4605 ext 427",
    email: "dylan.willis@apirx.com",
    color: "#0f7fb3",
  },
  // Operations — Scottsboro
  {
    name: "Amanda Gorham",
    title: "Warehouse Ops Manager - Scottsboro",
    phone: "256-574-6819 ext 203",
    email: "amanda.gorham@apirx.com",
    color: "#1f4f84",
  },
  {
    name: "David Johnson",
    title: "Warehouse Ops Assistant - Scottsboro",
    phone: "256-574-6819 ext 254",
    email: "david@apirx.com",
    color: "#1f4f84",
  },
  {
    name: "Robby Donnelly",
    title: "Warehouse Supervisor - Scottsboro",
    phone: "256-574-6819 ext 255",
    email: "robert.donnelly@apirx.com",
    color: "#1f4f84",
  },
  {
    name: "Linda Dodson",
    title: "Asst. Warehouse Supervisor - Scottsboro",
    phone: "256-574-6819 ext 255",
    email: "linda.dodson@apirx.com",
    color: "#1f4f84",
  },
  // Operations — Memphis
  {
    name: "Will Ward",
    title: "Warehouse Ops Manager - Memphis",
    phone: "901-800-4600 ext 413",
    email: "will.ward@apirx.com",
    color: "#1f4f84",
  },
  {
    name: "Joseph Isom",
    title: "Warehouse Supervisor - Memphis",
    phone: "901-623-5778",
    email: "joseph.isom@apirx.com",
    color: "#1f4f84",
  },
  {
    name: "Bryan Hawthorn",
    title: "Asst. Warehouse Supervisor - Memphis",
    phone: "501-230-9132",
    email: "bryan.hawthorn@apirx.com",
    color: "#1f4f84",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ContactCard({ contact }: { contact: (typeof CONTACTS)[number] }) {
  return (
    <div
      className="rounded-[14px] p-4"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "0 10px 24px rgba(12, 24, 47, 0.08)",
      }}
    >
      <div className="mb-3 h-[3px] w-10 rounded-full" style={{ backgroundColor: contact.color }} />

      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${contact.color}, #0f7fb3)` }}
        >
          {initials(contact.name)}
        </div>

        <div className="min-w-0">
          <p className="text-[0.82rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>{contact.name}</p>
          <p className="text-[0.72rem] leading-tight" style={{ color: "var(--module-context)" }}>{contact.title}</p>

          <div className="mt-2 space-y-1.5">
            <a
              href={`tel:${contact.phone.replace(/\D/g, "")}`}
              className="flex items-center gap-1.5 text-[0.72rem] transition-colors"
              style={{ color: "var(--module-context)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--heading-color)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--module-context)")}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 2h2.5l1 2.5-1.5 1a7 7 0 003.5 3.5l1-1.5L11 8.5V11a1 1 0 01-1 1C4.477 12 0 7.523 0 3a1 1 0 011-1h1z" />
              </svg>
              {contact.phone}
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 truncate text-[0.72rem] transition-colors"
              style={{ color: "var(--module-context)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--heading-color)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--module-context)")}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="2.5" width="10" height="7" rx="1" />
                <path d="M1 4l5 3.5L11 4" />
              </svg>
              {contact.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

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

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  "quick-links": { bg: "rgba(6,182,212,0.14)", icon: "#0f7fb3" },
  policies: { bg: "rgba(27,44,86,0.12)", icon: "#1b2c56" },
  forms: { bg: "rgba(223,0,48,0.1)", icon: "#c4002a" },
  "hr-systems": { bg: "rgba(15,127,179,0.14)", icon: "#0f7fb3" },
};

function getTrackAccent(tracks?: string[]): string {
  if (!tracks || tracks.length === 0) return "#94a3b8"; // slate for "all"
  if (tracks.length === 1 && tracks[0] === "hr") return "linear-gradient(to bottom, #0f7fb3, #df0030)";
  if (tracks.length === 1) return "#e8838f"; // soft red for single non-HR track
  return "#e8838f"; // soft red for multi-track
}

function ResourceCard({ resource }: { resource: Resource }) {
  const [downloading, setDownloading] = useState(false);
  const colors = CATEGORY_COLORS[resource.category] ?? { bg: "rgba(6,182,212,0.14)", icon: "#0f7fb3" };

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

  const accent = getTrackAccent(resource.tracks);

  return (
    <div
      className="flex overflow-hidden rounded-[16px]"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "0 14px 28px rgba(12, 24, 47, 0.09)",
      }}
    >
      <div
        className="w-[4px] shrink-0 rounded-l-[16px]"
        style={{ background: accent }}
      />
      <div className="flex flex-1 flex-col p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.bg }}>
        <span style={{ color: colors.icon }}>{resource.type === "link" ? <ExternalLinkIcon /> : <DownloadIcon />}</span>
      </div>

      <p className="mb-1 text-[0.9rem] font-semibold leading-snug" style={{ color: "var(--heading-color)" }}>{resource.title}</p>
      <p className="mb-4 flex-1 text-[0.78rem] leading-relaxed" style={{ color: "var(--module-context)" }}>{resource.description}</p>

      {resource.type === "link" ? (
        <a
          href={resource.url}
          target={resource.url?.startsWith("/") ? "_self" : "_blank"}
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[0.78rem] font-semibold transition-all duration-150 hover:-translate-y-px"
          style={{ backgroundColor: colors.bg, color: colors.icon }}
        >
          Open
          <ExternalLinkIcon />
        </a>
      ) : (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[0.78rem] font-semibold transition-all duration-150 hover:-translate-y-px disabled:opacity-60"
          style={{ backgroundColor: colors.bg, color: colors.icon }}
        >
          {downloading ? "Downloading..." : "Download"}
          {!downloading && <DownloadIcon />}
        </button>
      )}
      </div>
    </div>
  );
}

export default function ResourceHubPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetcher = useCallback(
    () => resourcesApi.list(activeCategory !== "all" ? activeCategory : undefined, debouncedQuery || undefined) as Promise<Resource[]>,
    [activeCategory, debouncedQuery]
  );

  const swrKey = `resources:${activeCategory}:${debouncedQuery}`;
  const { data: resources, isLoading: loadingResources } = useSWR(swrKey, fetcher);
  const { data: categories } = useSWR("resource-categories", () => resourcesApi.categories() as Promise<ResourceCategory[]>);

  const allCategories: ResourceCategory[] = [{ id: "all", label: "All" }, ...(categories ?? [])];

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
            Resource Hub
          </p>
          <h1 className="text-[1.6rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>Everything you need, in one polished place.</h1>
          <p className="mt-1.5 text-[0.9rem]" style={{ color: "var(--module-context)" }}>
            Quick links, downloadable docs, and practical guides to keep your onboarding flow smooth.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div
              className="mb-6 flex flex-col gap-3 rounded-[14px] p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 12px 24px rgba(12,24,47,0.07)",
              }}
            >
              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--module-context)" }}>
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl py-2 pl-9 pr-4 text-[0.84rem] focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition-all duration-150",
                      activeCategory === cat.id
                        ? "bg-[linear-gradient(135deg,#df0030_0%,#0f7fb3_100%)] text-white shadow-[0_8px_18px_rgba(15,127,179,0.2)]"
                        : ""
                    )}
                    style={activeCategory !== cat.id ? { background: "var(--login-input-bg)", color: "var(--module-body)", border: "1px solid var(--card-border)" } : undefined}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingResources ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : !resources || resources.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-[0.9rem] font-semibold" style={{ color: "var(--module-context)" }}>No resources found</p>
                {debouncedQuery && (
                  <p className="mt-1 text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>Try a different search term or clear the filter.</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {resources.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            )}
          </div>

          <aside className="w-full shrink-0 lg:w-64">
            <p className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#df0030]" />
              Key Contacts
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:space-y-0">
              {CONTACTS.map((c) => (
                <ContactCard key={c.email} contact={c} />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
