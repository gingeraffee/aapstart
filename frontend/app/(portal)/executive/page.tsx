"use client";

import { useState, useRef, useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { executiveApi } from "@/lib/api";
import type {
  ExecutiveDashboardData,
  WoshReport,
  WoshReportMeta,
  WoshByManagerChart,
  WoshException,
  HeadcountData,
  PTOAnalyticsData,
  ShiftAdherenceData,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ── view type ─────────────────────────────────────────────────────────────────
type View = "overview" | "headcount" | "hours" | "wosh" | "pto" | "adherence";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  return n.toLocaleString("en-US");
}
function fmtHrs(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── SubPageHeader ─────────────────────────────────────────────────────────────
function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:opacity-80"
        style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Overview
      </button>
      <h2 className="text-[1.2rem] font-bold" style={{ color: "var(--heading-color)" }}>{title}</h2>
    </div>
  );
}

// ── SectionNavCard ────────────────────────────────────────────────────────────
function SectionNavCard({
  title, kpi, sub, note, gradient, onClick,
}: {
  title: string; kpi: string; sub?: string; note?: string;
  gradient: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-[20px] px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{ background: gradient, color: "#fff", boxShadow: "0 4px 18px rgba(0,0,0,0.14)" }}
    >
      <p className="text-[0.63rem] font-bold uppercase tracking-[0.15em]" style={{ opacity: 0.72 }}>{title}</p>
      <p className="mt-2 text-[2rem] font-extrabold leading-none tracking-tight">{kpi}</p>
      {sub && <p className="mt-1 text-[0.78rem] font-medium" style={{ opacity: 0.82 }}>{sub}</p>}
      {note && <p className="mt-1 text-[0.7rem]" style={{ opacity: 0.62 }}>{note}</p>}
      <div className="mt-auto pt-4 flex items-center gap-1 text-[0.72rem] font-semibold" style={{ opacity: 0.75 }}>
        <span className="group-hover:underline">View details</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}

// ── DrillByManager ────────────────────────────────────────────────────────────
function DrillByManager({ data }: { data: WoshByManagerChart[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="space-y-2">
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
        Irregularities by Manager
      </p>
      {data.map(row => (
        <div key={row.manager}>
          <div className="mb-1 flex items-center justify-between gap-4">
            <span className="text-[0.8rem] font-medium truncate" style={{ color: "var(--heading-color)" }}>{row.manager}</span>
            <span className="shrink-0 text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{row.total}</span>
          </div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
            {row.early_only > 0 && (
              <div className="h-full rounded-l-full" style={{ width: `${(row.early_only / max) * 100}%`, background: "#3b82f6" }} title={`Early: ${row.early_only}`} />
            )}
            {row.late_only > 0 && (
              <div className="h-full" style={{ width: `${(row.late_only / max) * 100}%`, background: "#f59e0b" }} title={`Late: ${row.late_only}`} />
            )}
            {row.both > 0 && (
              <div className="h-full rounded-r-full" style={{ width: `${(row.both / max) * 100}%`, background: "#ef4444" }} title={`Both: ${row.both}`} />
            )}
          </div>
          <div className="mt-0.5 flex gap-3 text-[0.67rem]" style={{ color: "var(--card-desc)" }}>
            <span style={{ color: "#3b82f6" }}>Early {row.early_only}</span>
            <span style={{ color: "#f59e0b" }}>Late {row.late_only}</span>
            <span style={{ color: "#ef4444" }}>Both {row.both}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DrillByDay ────────────────────────────────────────────────────────────────
function DrillByDay({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-1.5">
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
        By Day of Week
      </p>
      {data.map(row => (
        <div key={row.day} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-[0.78rem] font-semibold" style={{ color: "var(--heading-color)" }}>{row.day}</span>
          <div className="flex-1 h-2 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
            <div className="h-full rounded-full" style={{ width: `${(row.count / max) * 100}%`, background: "linear-gradient(90deg,#1e3a5f,#2563eb)" }} />
          </div>
          <span className="w-6 shrink-0 text-right text-[0.78rem] font-bold" style={{ color: "var(--heading-color)" }}>{row.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── DrillTopEmployees ─────────────────────────────────────────────────────────
function DrillTopEmployees({ data }: { data: { employee_name: string; manager: string | null; total: number; early: number; late: number }[] }) {
  return (
    <div>
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
        Top Employees by Irregularities
      </p>
      <div className="overflow-hidden rounded-[10px]" style={{ border: "1px solid var(--card-border)" }}>
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
              {["Employee", "Manager", "Total", "Early", "Late"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: "var(--module-context)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                <td className="px-3 py-2 font-medium" style={{ color: "var(--heading-color)" }}>{row.employee_name}</td>
                <td className="px-3 py-2" style={{ color: "var(--card-desc)" }}>{row.manager ?? "—"}</td>
                <td className="px-3 py-2 text-right font-bold" style={{ color: "var(--heading-color)" }}>{row.total}</td>
                <td className="px-3 py-2 text-right" style={{ color: "#3b82f6" }}>{row.early}</td>
                <td className="px-3 py-2 text-right" style={{ color: "#f59e0b" }}>{row.late}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ManagerSummaryTable ───────────────────────────────────────────────────────
function ManagerSummaryTable({ data }: { data: WoshByManagerChart[] }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
        <h3 className="text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>Irregularities by Manager</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.8rem]">
          <thead>
            <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
              <th className="px-5 py-3 text-left font-semibold" style={{ color: "var(--module-context)" }}>Manager</th>
              <th className="px-4 py-3 text-center font-semibold w-20" style={{ color: "#3b82f6" }}>Early Only</th>
              <th className="px-4 py-3 text-center font-semibold w-20" style={{ color: "#f59e0b" }}>Late Only</th>
              <th className="px-4 py-3 text-center font-semibold w-16" style={{ color: "#ef4444" }}>Both</th>
              <th className="px-4 py-3 text-center font-semibold w-16" style={{ color: "var(--module-context)" }}>Total</th>
              <th className="px-5 py-3 text-left font-semibold" style={{ color: "var(--module-context)" }}>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.manager} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                <td className="px-5 py-3 font-semibold" style={{ color: "var(--heading-color)" }}>{row.manager}</td>
                <td className="px-4 py-3 text-center" style={{ color: "#3b82f6" }}>{row.early_only}</td>
                <td className="px-4 py-3 text-center" style={{ color: "#f59e0b" }}>{row.late_only}</td>
                <td className="px-4 py-3 text-center" style={{ color: "#ef4444" }}>{row.both}</td>
                <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--heading-color)" }}>{row.total}</td>
                <td className="px-5 py-3 min-w-[120px]">
                  <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                    {row.early_only > 0 && <div style={{ width: `${(row.early_only / maxTotal) * 100}%`, background: "#3b82f6" }} className="h-full" />}
                    {row.late_only > 0 && <div style={{ width: `${(row.late_only / maxTotal) * 100}%`, background: "#f59e0b" }} className="h-full" />}
                    {row.both > 0 && <div style={{ width: `${(row.both / maxTotal) * 100}%`, background: "#ef4444" }} className="h-full rounded-r-full" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ExceptionsTable ───────────────────────────────────────────────────────────
const EXCEPTION_TYPE_COLORS: Record<string, string> = {
  "Early": "bg-blue-50 text-blue-700",
  "Late": "bg-amber-50 text-amber-700",
  "Early & Late": "bg-red-50 text-red-700",
};

function ExceptionsTable({ exceptions }: { exceptions: WoshException[] }) {
  const [filterManager, setFilterManager] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const managers = useMemo(() => {
    const s = new Set(exceptions.map(e => e.Manager).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [exceptions]);

  const types = useMemo(() => {
    const s = new Set(exceptions.map(e => e["Exception Type"]).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [exceptions]);

  const filtered = useMemo(() => {
    return exceptions.filter(e => {
      if (filterManager && e.Manager !== filterManager) return false;
      if (filterType && e["Exception Type"] !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (e["Employee Name"] ?? "").toLowerCase().includes(q) ||
          String(e["Employee #"] ?? "").includes(q)
        );
      }
      return true;
    });
  }, [exceptions, filterManager, filterType, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectStyle = {
    background: "var(--login-input-bg)",
    border: "1px solid var(--login-input-border)",
    color: "var(--heading-color)",
    borderRadius: "10px",
    padding: "6px 10px",
    fontSize: "0.78rem",
    outline: "none",
  };

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="mr-2 text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
            All Exceptions
            <span className="ml-2 text-[0.75rem] font-normal" style={{ color: "var(--card-desc)" }}>
              {filtered.length} of {exceptions.length}
            </span>
          </h3>
          <input
            type="text"
            placeholder="Search employee…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 min-w-[140px]"
            style={{ ...selectStyle, flex: "1 1 140px" }}
          />
          <select value={filterManager} onChange={e => { setFilterManager(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="">All Managers</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(filterManager || filterType || search) && (
            <button
              onClick={() => { setFilterManager(""); setFilterType(""); setSearch(""); setPage(0); }}
              className="rounded-[8px] px-2.5 py-1.5 text-[0.72rem] font-semibold transition-all hover:opacity-80"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.77rem]">
          <thead>
            <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
              {["Employee", "Emp #", "Manager", "Department", "Date", "Sched Start", "Sched End", "Clock In", "Clock Out", "Time Early", "Time Late", "Type"].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold" style={{ color: "var(--module-context)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={12} className="px-5 py-8 text-center text-[0.8rem]" style={{ color: "var(--card-desc)" }}>No exceptions match the current filters.</td></tr>
            ) : paged.map((row, i) => {
              const typeColor = EXCEPTION_TYPE_COLORS[row["Exception Type"] ?? ""] ?? "";
              return (
                <tr key={i} style={{ borderBottom: i < paged.length - 1 ? "1px solid var(--card-border)" : "none", background: i % 2 === 0 ? "transparent" : "var(--tab-group-bg)" }}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: "var(--heading-color)" }}>{row["Employee Name"] ?? "—"}</td>
                  <td className="px-3 py-2" style={{ color: "var(--card-desc)" }}>{row["Employee #"] ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--heading-color)" }}>{row.Manager ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--card-desc)" }}>{row.Department ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--heading-color)" }}>{row.Date ? fmtDate(row.Date) : "—"}</td>
                  <td className="px-3 py-2" style={{ color: "var(--card-desc)" }}>{row["Scheduled Start"] ?? "—"}</td>
                  <td className="px-3 py-2" style={{ color: "var(--card-desc)" }}>{row["Scheduled End"] ?? "—"}</td>
                  <td className="px-3 py-2" style={{ color: row["Time Early"] ? "#2563eb" : "var(--card-desc)" }}>{row["Actual Clock In"] ?? "—"}</td>
                  <td className="px-3 py-2" style={{ color: row["Time Late"] ? "#b45309" : "var(--card-desc)" }}>{row["Actual Clock Out"] ?? "—"}</td>
                  <td className="px-3 py-2 font-medium" style={{ color: "#2563eb" }}>{row["Time Early"] ?? "—"}</td>
                  <td className="px-3 py-2 font-medium" style={{ color: "#b45309" }}>{row["Time Late"] ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-semibold", typeColor)}>
                      {row["Exception Type"] ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: "var(--card-border)" }}>
          <span className="text-[0.75rem]" style={{ color: "var(--card-desc)" }}>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="rounded-[8px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}>
              Prev
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="rounded-[8px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HoursByLocation ───────────────────────────────────────────────────────────
type LocationHours = {
  location: string;
  regular_hours: number;
  ot_hours: number;
  departments: { department: string; regular_hours: number; ot_hours: number }[];
};

function HoursByLocation({ locations }: { locations: LocationHours[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {locations.map((loc) => {
        const isOpen = open === loc.location;
        const total = loc.regular_hours + loc.ot_hours;
        const otPct = total > 0 ? ((loc.ot_hours / total) * 100).toFixed(1) : "0.0";
        return (
          <div key={loc.location} className="overflow-hidden rounded-[18px]"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
            <button
              onClick={() => setOpen(isOpen ? null : loc.location)}
              className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-all hover:bg-black/[0.02]"
            >
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>Location</p>
                <p className="mt-0.5 text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>{loc.location}</p>
                <div className="mt-2 flex gap-4">
                  <div>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Regular</p>
                    <p className="text-[1.2rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{loc.regular_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</p>
                  </div>
                  <div>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>OT</p>
                    <p className="text-[1.2rem] font-extrabold leading-tight" style={{ color: "#b45309" }}>{loc.ot_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</p>
                  </div>
                  <div>
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>OT %</p>
                    <p className="text-[1.2rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{otPct}%</p>
                  </div>
                </div>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                className={cn("mt-1 shrink-0 transition-transform duration-200", isOpen && "rotate-90")} style={{ color: "var(--card-desc)" }}>
                <path d="M3 1.5L7 5L3 8.5" />
              </svg>
            </button>
            {isOpen && (
              <div className="border-t px-5 pb-3 pt-2" style={{ borderColor: "var(--card-border)" }}>
                <table className="w-full text-[0.74rem]">
                  <thead>
                    <tr>
                      <th className="pb-1.5 text-left font-bold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)", fontSize: "0.6rem" }}>Department</th>
                      <th className="pb-1.5 text-right font-bold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)", fontSize: "0.6rem" }}>Regular</th>
                      <th className="pb-1.5 text-right font-bold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)", fontSize: "0.6rem" }}>OT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loc.departments.map((d) => (
                      <tr key={d.department} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                        <td className="py-1.5 font-medium" style={{ color: "var(--heading-color)" }}>{d.department}</td>
                        <td className="py-1.5 text-right" style={{ color: "var(--heading-color)" }}>{d.regular_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</td>
                        <td className="py-1.5 text-right font-semibold" style={{ color: d.ot_hours > 0 ? "#b45309" : "var(--card-desc)" }}>{d.ot_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── UploadBar ─────────────────────────────────────────────────────────────────
function UploadBar({ onUploaded }: { onUploaded: () => void }) {
  const [weekLabel, setWeekLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await executiveApi.uploadWosh(file, weekLabel);
      setSuccess(`Uploaded: ${result.week_label ?? "report"} — ${result.exceptions} exceptions across ${result.managers} managers`);
      setWeekLabel("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-5 rounded-[14px] px-5 py-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
            Upload WOSH Report
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Week label (auto-detected if blank)"
              value={weekLabel}
              onChange={e => setWeekLabel(e.target.value)}
              className="rounded-[10px] px-3 py-2 text-[0.78rem] w-64"
              style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }}
            />
            <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls" onChange={handleFile} disabled={uploading} className="hidden" id="wosh-upload" />
            <label
              htmlFor="wosh-upload"
              className={cn("inline-flex cursor-pointer items-center gap-2 rounded-[10px] px-4 py-2 text-[0.78rem] font-semibold transition-all select-none", uploading && "opacity-50 cursor-not-allowed")}
              style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 82%)", color: "#fff" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploading ? "Uploading…" : "Choose File"}
            </label>
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-[0.75rem] font-medium text-red-600">{error}</p>}
      {success && <p className="mt-2 text-[0.75rem] font-medium text-emerald-600">{success}</p>}
    </div>
  );
}

// ── HeadcountView ─────────────────────────────────────────────────────────────
function HeadcountView({ data, onBack }: { data: HeadcountData; onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const maxTotal = Math.max(...data.by_location.map(l => l.total), 1);

  return (
    <div>
      <SubPageHeader title="Employee Headcount" onBack={onBack} />
      <div className="mb-5 rounded-[18px] px-6 py-5" style={{ background: "linear-gradient(135deg,#134e26 0%,#16a34a 82%)", color: "#fff" }}>
        <p className="text-[0.63rem] font-bold uppercase tracking-[0.15em]" style={{ opacity: 0.72 }}>Total Active Employees</p>
        <p className="mt-1 text-[3rem] font-extrabold leading-none">{fmtNum(data.total)}</p>
        <p className="mt-1 text-[0.8rem]" style={{ opacity: 0.8 }}>{data.by_location.length} locations</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.by_location.map(loc => {
          const isOpen = open === loc.location;
          const maxDept = Math.max(...loc.departments.map(d => d.count), 1);
          return (
            <div key={loc.location} className="overflow-hidden rounded-[18px]"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <button
                onClick={() => setOpen(isOpen ? null : loc.location)}
                className="w-full px-5 py-4 text-left hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[0.63rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>Location</p>
                    <p className="mt-0.5 text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>{loc.location}</p>
                    <p className="text-[2rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{fmtNum(loc.total)}</p>
                    <p className="text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
                      {((loc.total / data.total) * 100).toFixed(1)}% of workforce · {loc.departments.length} dept{loc.departments.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"
                    className={cn("mt-2 shrink-0 transition-transform duration-200", isOpen && "rotate-90")} style={{ color: "var(--card-desc)" }}>
                    <path d="M3 1.5L7 5L3 8.5" />
                  </svg>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(loc.total / maxTotal) * 100}%`, background: "linear-gradient(90deg,#134e26,#16a34a)" }} />
                </div>
              </button>
              {isOpen && (
                <div className="border-t px-5 pb-4 pt-3" style={{ borderColor: "var(--card-border)" }}>
                  <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>By Department</p>
                  <div className="space-y-2.5">
                    {loc.departments.map(dept => (
                      <div key={dept.department}>
                        <div className="mb-1 flex justify-between">
                          <span className="text-[0.78rem] font-medium" style={{ color: "var(--heading-color)" }}>{dept.department}</span>
                          <span className="text-[0.78rem] font-bold" style={{ color: "var(--heading-color)" }}>{dept.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(dept.count / maxDept) * 100}%`, background: "linear-gradient(90deg,#134e26,#16a34a)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── HoursView ─────────────────────────────────────────────────────────────────
function HoursView({ locations, onBack }: { locations: LocationHours[]; onBack: () => void }) {
  const totalReg = locations.reduce((s, l) => s + l.regular_hours, 0);
  const totalOT  = locations.reduce((s, l) => s + l.ot_hours, 0);
  const total    = totalReg + totalOT;
  const otPct    = total > 0 ? ((totalOT / total) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <SubPageHeader title="Hours by Location" onBack={onBack} />
      <div className="mb-5 rounded-[18px] px-6 py-5" style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 82%)", color: "#fff" }}>
        <p className="text-[0.63rem] font-bold uppercase tracking-[0.15em]" style={{ opacity: 0.72 }}>Total Hours</p>
        <p className="mt-1 text-[3rem] font-extrabold leading-none">{fmtHrs(total)}</p>
        <div className="mt-1 flex gap-4 text-[0.8rem]" style={{ opacity: 0.85 }}>
          <span>Regular: {fmtHrs(totalReg)}</span>
          <span>OT: {fmtHrs(totalOT)} ({otPct}%)</span>
        </div>
      </div>
      <HoursByLocation locations={locations} />
    </div>
  );
}

// ── WOSHView ──────────────────────────────────────────────────────────────────
function WOSHView({
  report, history, selectedId, onSelectId, onUploaded, showUpload, onBack,
}: {
  report: WoshReport | null | undefined;
  history: WoshReportMeta[] | undefined;
  selectedId: number | null;
  onSelectId: (id: number | null) => void;
  onUploaded: () => void;
  showUpload: boolean;
  onBack: () => void;
}) {
  const summary = report?.parsed_data?.summary ?? null;
  const pd = report?.parsed_data ?? null;

  return (
    <div>
      <SubPageHeader title="WOSH Report" onBack={onBack} />

      {showUpload && <UploadBar onUploaded={onUploaded} />}

      {history && history.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-[0.72rem] font-semibold" style={{ color: "var(--module-context)" }}>Week:</label>
          <select
            value={selectedId ?? ""}
            onChange={e => onSelectId(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-[10px] px-3 py-1.5 text-[0.78rem]"
            style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }}
          >
            <option value="">Latest</option>
            {history.map(r => <option key={r.id} value={r.id}>{r.week_label ?? `Report #${r.id}`}</option>)}
          </select>
        </div>
      )}

      {summary ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Irregularities", value: fmtNum(summary.total_violations) },
              { label: "Employees Affected",   value: fmtNum(summary.employees_affected) },
              { label: "Early Arrivals",        value: fmtNum(summary.early_arrivals) },
              { label: "Late Departures",       value: fmtNum(summary.late_departures) },
            ].map(k => (
              <div key={k.label} className="rounded-[14px] px-4 py-3" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
                <p className="text-[0.62rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>{k.label}</p>
                <p className="mt-1 text-[1.6rem] font-extrabold leading-none" style={{ color: "var(--heading-color)" }}>{k.value}</p>
              </div>
            ))}
          </div>

          {report?.week_label && (
            <p className="mb-4 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>
              <span className="font-semibold" style={{ color: "var(--heading-color)" }}>{report.week_label}</span>
              {report.week_start && report.week_end && ` · ${fmtDate(report.week_start)} – ${fmtDate(report.week_end)}`}
            </p>
          )}

          <div className="mb-5 grid gap-5 md:grid-cols-2">
            <div className="rounded-[14px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <DrillByManager data={pd?.chart.by_manager ?? []} />
            </div>
            <div className="rounded-[14px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <DrillByDay data={pd?.chart.by_day ?? []} />
            </div>
          </div>

          {pd?.top_employees && pd.top_employees.length > 0 && (
            <div className="mb-5 rounded-[14px] p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <DrillTopEmployees data={pd.top_employees} />
            </div>
          )}

          {pd?.chart.by_manager && pd.chart.by_manager.length > 0 && (
            <div className="mb-5"><ManagerSummaryTable data={pd.chart.by_manager} /></div>
          )}

          {pd?.exceptions && pd.exceptions.length > 0 && (
            <ExceptionsTable exceptions={pd.exceptions as WoshException[]} />
          )}
        </>
      ) : (
        <div className="rounded-[14px] py-12 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>No WOSH report uploaded yet</p>
          <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>
            {showUpload
              ? "Use the upload area above to import a Shift_Exception_Report.xlsx."
              : "Contact your HR administrator to upload a WOSH report."}
          </p>
        </div>
      )}
    </div>
  );
}

// ── PTOView ───────────────────────────────────────────────────────────────────
function PTOView({ data, onBack }: { data: PTOAnalyticsData; onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const maxPTO = Math.max(...data.locations.map(l => l.total_pto), 1);

  return (
    <div>
      <SubPageHeader title="PTO Analytics" onBack={onBack} />
      <div className="mb-5 rounded-[18px] px-6 py-5" style={{ background: "linear-gradient(135deg,#0e4966 0%,#0ea5e9 82%)", color: "#fff" }}>
        <p className="text-[0.63rem] font-bold uppercase tracking-[0.15em]" style={{ opacity: 0.72 }}>Total PTO Hours Used</p>
        <p className="mt-1 text-[3rem] font-extrabold leading-none">{fmtHrs(data.total_pto)}</p>
        <p className="mt-1 text-[0.8rem]" style={{ opacity: 0.8 }}>Vacation + personal time across all locations</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.locations.map(loc => {
          const isOpen = open === loc.location;
          const locTotal = loc.vacation_hours + loc.personal_hours;
          const maxDept = Math.max(...loc.departments.map(d => d.total_pto), 1);
          return (
            <div key={loc.location} className="overflow-hidden rounded-[18px]"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <button
                onClick={() => setOpen(isOpen ? null : loc.location)}
                className="w-full px-5 py-4 text-left hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[0.63rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>Location</p>
                    <p className="mt-0.5 text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>{loc.location}</p>
                    <p className="text-[2rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{fmtHrs(locTotal)}</p>
                    <p className="text-[0.7rem]" style={{ color: "var(--card-desc)" }}>PTO hours</p>
                    <div className="mt-1.5 flex gap-3 text-[0.68rem]">
                      <span style={{ color: "#0ea5e9" }}>Vacation: {fmtHrs(loc.vacation_hours)}</span>
                      <span style={{ color: "#818cf8" }}>Personal: {fmtHrs(loc.personal_hours)}</span>
                    </div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"
                    className={cn("mt-2 shrink-0 transition-transform duration-200", isOpen && "rotate-90")} style={{ color: "var(--card-desc)" }}>
                    <path d="M3 1.5L7 5L3 8.5" />
                  </svg>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(locTotal / maxPTO) * 100}%`, background: "linear-gradient(90deg,#0e4966,#0ea5e9)" }} />
                </div>
              </button>
              {isOpen && (
                <div className="border-t px-5 pb-4 pt-3" style={{ borderColor: "var(--card-border)" }}>
                  <p className="mb-2.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>By Department</p>
                  <div className="space-y-3">
                    {loc.departments.map(dept => (
                      <div key={dept.department}>
                        <div className="mb-0.5 flex justify-between">
                          <span className="text-[0.78rem] font-medium" style={{ color: "var(--heading-color)" }}>{dept.department}</span>
                          <span className="text-[0.78rem] font-bold" style={{ color: "var(--heading-color)" }}>{fmtHrs(dept.total_pto)}</span>
                        </div>
                        <div className="flex gap-2 text-[0.65rem] mb-1">
                          <span style={{ color: "#0ea5e9" }}>V: {fmtHrs(dept.vacation_hours)}</span>
                          <span style={{ color: "var(--card-desc)" }}>·</span>
                          <span style={{ color: "#818cf8" }}>P: {fmtHrs(dept.personal_hours)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(dept.total_pto / maxDept) * 100}%`, background: "linear-gradient(90deg,#0e4966,#0ea5e9)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AdherenceView ─────────────────────────────────────────────────────────────
function AdherenceView({ data, onBack }: { data: ShiftAdherenceData; onBack: () => void }) {
  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <SubPageHeader title="Shift Adherence" onBack={onBack} />

      {data.top_manager && data.top_score != null && (
        <div className="mb-5 rounded-[18px] px-6 py-5" style={{ background: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 82%)", color: "#fff" }}>
          <p className="text-[0.63rem] font-bold uppercase tracking-[0.15em]" style={{ opacity: 0.72 }}>Top Performing Team</p>
          <p className="mt-1 text-[1.9rem] font-extrabold leading-tight">{data.top_manager}</p>
          <p className="mt-0.5 text-[0.85rem]" style={{ opacity: 0.85 }}>{data.top_score}% adherence score</p>
        </div>
      )}

      <div className="overflow-hidden rounded-[18px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--card-border)" }}>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>
            All Managers — Ranked by Adherence Score
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
          {data.managers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[0.84rem]" style={{ color: "var(--card-desc)" }}>No manager data yet. Import time records to see adherence rankings.</p>
            </div>
          ) : data.managers.map((mgr, i) => {
            const scoreColor = mgr.adherence_score >= 85 ? "#16a34a" : mgr.adherence_score >= 70 ? "#d97706" : "#dc2626";
            const barGrad = mgr.adherence_score >= 85
              ? "linear-gradient(90deg,#134e26,#16a34a)"
              : mgr.adherence_score >= 70
              ? "linear-gradient(90deg,#92400e,#d97706)"
              : "linear-gradient(90deg,#7f1d1d,#dc2626)";
            return (
              <div key={mgr.manager_id} className="px-5 py-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className="mt-0.5 w-7 shrink-0 text-center text-[0.95rem]">
                    {MEDAL[i] ?? <span className="text-[0.72rem] font-bold" style={{ color: "var(--module-context)" }}>#{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.88rem] font-bold truncate" style={{ color: "var(--heading-color)" }}>{mgr.manager_name}</span>
                      <span className="shrink-0 text-[1.15rem] font-extrabold" style={{ color: scoreColor }}>{mgr.adherence_score}%</span>
                    </div>
                    <p className="text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
                      {mgr.location}{mgr.department ? ` · ${mgr.department}` : ""} · {mgr.team_size} team member{mgr.team_size !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="ml-10">
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                    <div className="h-full rounded-full" style={{ width: `${mgr.adherence_score}%`, background: barGrad }} />
                  </div>
                  <div className="mt-1.5 flex gap-4 text-[0.67rem]" style={{ color: "var(--card-desc)" }}>
                    <span>OT Rate: <strong style={{ color: "var(--heading-color)" }}>{mgr.ot_rate}%</strong></span>
                    <span>Unexcused Absent: <strong style={{ color: "var(--heading-color)" }}>{fmtHrs(mgr.absent_w_point_hours)} hrs</strong></span>
                    <span>Reg Hrs: <strong style={{ color: "var(--heading-color)" }}>{fmtHrs(mgr.regular_hours)}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── OverviewView ──────────────────────────────────────────────────────────────
function OverviewView({
  headcountData,
  hoursData,
  latestReport,
  ptoData,
  adherenceData,
  onNavigate,
}: {
  headcountData: HeadcountData | undefined;
  hoursData: { locations: LocationHours[] } | undefined;
  latestReport: WoshReport | null | undefined;
  ptoData: PTOAnalyticsData | undefined;
  adherenceData: ShiftAdherenceData | undefined;
  onNavigate: (view: View) => void;
}) {
  const LOCATIONS = ["AAP", "API Scottsboro", "API Memphis"];

  const locationSnap = useMemo(() => {
    return LOCATIONS.map(loc => {
      const hc = headcountData?.by_location.find(l => l.location === loc);
      const hr = hoursData?.locations.find(l => l.location === loc);
      return {
        location: loc,
        headcount: hc?.total ?? 0,
        reg_hours: hr?.regular_hours ?? 0,
        ot_hours: hr?.ot_hours ?? 0,
      };
    }).filter(l => l.headcount > 0 || l.reg_hours > 0);
  }, [headcountData, hoursData]);

  const totalReg = hoursData?.locations.reduce((s, l) => s + l.regular_hours, 0) ?? 0;
  const totalOT  = hoursData?.locations.reduce((s, l) => s + l.ot_hours, 0) ?? 0;
  const otPct    = totalReg + totalOT > 0 ? `${((totalOT / (totalReg + totalOT)) * 100).toFixed(1)}%` : "—";

  const woshSummary = latestReport?.parsed_data?.summary ?? null;

  return (
    <div>
      {/* Location snapshot */}
      {locationSnap.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {locationSnap.map(loc => {
            const total = loc.reg_hours + loc.ot_hours;
            const otP = total > 0 ? `${((loc.ot_hours / total) * 100).toFixed(1)}%` : "—";
            return (
              <div key={loc.location} className="rounded-[16px] px-4 py-4"
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>{loc.location}</p>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {[
                    { label: "Employees", value: fmtNum(loc.headcount) },
                    { label: "Reg Hrs",   value: fmtHrs(loc.reg_hours) },
                    { label: "OT %",      value: otP },
                  ].map(stat => (
                    <div key={stat.label}>
                      <p className="text-[0.56rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>{stat.label}</p>
                      <p className="text-[1rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section nav cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionNavCard
          title="Headcount"
          kpi={headcountData ? fmtNum(headcountData.total) : "—"}
          sub={headcountData ? `${headcountData.by_location.length} locations · department drill-down` : "Loading…"}
          gradient="linear-gradient(135deg,#134e26 0%,#16a34a 82%)"
          onClick={() => onNavigate("headcount")}
        />
        <SectionNavCard
          title="Hours by Location"
          kpi={hoursData ? fmtHrs(totalReg + totalOT) : "—"}
          sub={`${otPct} overtime · department drill-down`}
          gradient="linear-gradient(135deg,#1e3a5f 0%,#2563eb 82%)"
          onClick={() => onNavigate("hours")}
        />
        <SectionNavCard
          title="WOSH Report"
          kpi={woshSummary ? fmtNum(woshSummary.total_violations) : "—"}
          sub={woshSummary
            ? `${woshSummary.employees_affected} employees · ${latestReport?.week_label ?? ""}`
            : "No report uploaded"}
          note={woshSummary ? `${woshSummary.early_arrivals} early arrivals · ${woshSummary.late_departures} late departures` : undefined}
          gradient="linear-gradient(135deg,#7f1d1d 0%,#dc2626 82%)"
          onClick={() => onNavigate("wosh")}
        />
        <SectionNavCard
          title="PTO Analytics"
          kpi={ptoData ? fmtHrs(ptoData.total_pto) : "—"}
          sub="Vacation + personal time · by location"
          gradient="linear-gradient(135deg,#0e4966 0%,#0ea5e9 82%)"
          onClick={() => onNavigate("pto")}
        />
        <SectionNavCard
          title="Shift Adherence"
          kpi={adherenceData?.top_score != null ? `${adherenceData.top_score}%` : "—"}
          sub={adherenceData?.top_manager ? `Best: ${adherenceData.top_manager}` : "Manager team rankings"}
          note={adherenceData && adherenceData.managers.length > 0 ? `${adherenceData.managers.length} managers ranked` : undefined}
          gradient="linear-gradient(135deg,#4c1d95 0%,#7c3aed 82%)"
          onClick={() => onNavigate("adherence")}
        />
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ExecutivePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // All data fetched upfront for instant sub-page loads
  const { data: latestReport, mutate: mutateLatest } = useSWR<WoshReport | null>(
    "wosh-latest", () => executiveApi.woshLatest()
  );
  const { data: history, mutate: mutateHistory } = useSWR<WoshReportMeta[]>(
    "wosh-history", () => executiveApi.woshHistory()
  );
  const { data: selectedReport } = useSWR<WoshReport>(
    selectedId !== null ? `wosh-${selectedId}` : null,
    () => executiveApi.woshById(selectedId!)
  );
  const { data: hoursData } = useSWR(
    "executive-hours-by-location", () => executiveApi.hoursByLocation()
  );
  const { data: headcountData } = useSWR<HeadcountData>(
    "executive-headcount", () => executiveApi.headcount()
  );
  const { data: ptoData } = useSWR<PTOAnalyticsData>(
    "executive-pto", () => executiveApi.ptoAnalytics()
  );
  const { data: adherenceData } = useSWR<ShiftAdherenceData>(
    "executive-adherence", () => executiveApi.shiftAdherence()
  );

  if (user && !user.is_executive && !user.is_admin) {
    router.replace("/overview");
    return null;
  }

  const activeReport = selectedId !== null ? selectedReport : latestReport;
  const showUpload = !!(user?.is_admin && user?.tracks?.includes("hr"));

  function handleUploaded() {
    mutateHistory();
    mutateLatest();
    setSelectedId(null);
  }

  function navigate(v: View) {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[1.5rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>
          Executive Summary
        </h1>
        <p className="mt-1 text-[0.8rem]" style={{ color: "var(--card-desc)" }}>
          Company-wide analytics · Click any card to drill in
        </p>
      </div>

      {view === "overview" && (
        <OverviewView
          headcountData={headcountData}
          hoursData={hoursData}
          latestReport={latestReport}
          ptoData={ptoData}
          adherenceData={adherenceData}
          onNavigate={navigate}
        />
      )}

      {view === "headcount" && headcountData && (
        <HeadcountView data={headcountData} onBack={() => navigate("overview")} />
      )}

      {view === "hours" && hoursData && (
        <HoursView locations={hoursData.locations} onBack={() => navigate("overview")} />
      )}

      {view === "wosh" && (
        <WOSHView
          report={activeReport}
          history={history}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          onUploaded={handleUploaded}
          showUpload={showUpload}
          onBack={() => navigate("overview")}
        />
      )}

      {view === "pto" && ptoData && (
        <PTOView data={ptoData} onBack={() => navigate("overview")} />
      )}

      {view === "adherence" && adherenceData && (
        <AdherenceView data={adherenceData} onBack={() => navigate("overview")} />
      )}

      {/* Loading states for sub-pages */}
      {view === "headcount" && !headcountData && (
        <div><SubPageHeader title="Employee Headcount" onBack={() => navigate("overview")} /><p className="text-[0.84rem]" style={{ color: "var(--card-desc)" }}>Loading…</p></div>
      )}
      {view === "hours" && !hoursData && (
        <div><SubPageHeader title="Hours by Location" onBack={() => navigate("overview")} /><p className="text-[0.84rem]" style={{ color: "var(--card-desc)" }}>Loading…</p></div>
      )}
      {view === "pto" && !ptoData && (
        <div><SubPageHeader title="PTO Analytics" onBack={() => navigate("overview")} /><p className="text-[0.84rem]" style={{ color: "var(--card-desc)" }}>Loading…</p></div>
      )}
      {view === "adherence" && !adherenceData && (
        <div><SubPageHeader title="Shift Adherence" onBack={() => navigate("overview")} /><p className="text-[0.84rem]" style={{ color: "var(--card-desc)" }}>Loading…</p></div>
      )}
    </div>
  );
}
