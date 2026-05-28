"use client";

import { useState, useRef, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { executiveApi } from "@/lib/api";
import type {
  ExecutiveDashboardData,
  WoshReport,
  WoshReportMeta,
  WoshByManagerChart,
  WoshException,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

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

type KpiId =
  | "violations" | "employees" | "early" | "late"
  | "total_emp" | "reg_hours" | "ot_hours";

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  id, label, value, sub, active, onClick, accent,
}: {
  id: KpiId; label: string; value: string | number; sub?: string;
  active: boolean; onClick: (id: KpiId) => void; accent?: string;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className="group relative flex-1 min-w-[130px] rounded-[14px] px-4 py-4 text-left transition-all duration-150 hover:shadow-md"
      style={{
        background: active ? (accent ?? "linear-gradient(135deg,#1e3a5f 0%,#2563eb 82%)") : "var(--card-bg)",
        border: active ? "1px solid transparent" : "1px solid var(--card-border)",
        boxShadow: active ? "0 4px 14px rgba(37,99,235,0.25)" : "var(--card-shadow)",
        color: active ? "#fff" : "inherit",
      }}
    >
      <p
        className="mb-1 text-[0.68rem] font-bold uppercase tracking-widest"
        style={{ color: active ? "rgba(255,255,255,0.75)" : "var(--module-context)" }}
      >
        {label}
      </p>
      <p className="text-[1.5rem] font-bold leading-none" style={{ color: active ? "#fff" : "var(--heading-color)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[0.7rem]" style={{ color: active ? "rgba(255,255,255,0.65)" : "var(--card-desc)" }}>
          {sub}
        </p>
      )}
      <div
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: active ? "rgba(255,255,255,0.6)" : "var(--module-context)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </button>
  );
}

// ── drill-down panels ─────────────────────────────────────────────────────────

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

function DrillHours({ rows }: { rows: ExecutiveDashboardData["hours_by_department"] }) {
  if (!rows.length) return <p className="text-[0.8rem]" style={{ color: "var(--card-desc)" }}>No hours data imported.</p>;
  return (
    <div className="overflow-x-auto rounded-[10px]" style={{ border: "1px solid var(--card-border)" }}>
      <table className="w-full text-[0.78rem]">
        <thead>
          <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
            {["Department", "Employees", "Regular Hrs", "OT Hrs", "OT %"].map(h => (
              <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--module-context)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const otPct = row.regular_hours + row.ot_hours > 0
              ? ((row.ot_hours / (row.regular_hours + row.ot_hours)) * 100).toFixed(1) : "0.0";
            return (
              <tr key={row.department} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                <td className="px-3 py-2 font-medium" style={{ color: "var(--heading-color)" }}>{row.department}</td>
                <td className="px-3 py-2 text-center" style={{ color: "var(--heading-color)" }}>{row.employee_count}</td>
                <td className="px-3 py-2 text-right" style={{ color: "var(--heading-color)" }}>{fmtHrs(row.regular_hours)}</td>
                <td className="px-3 py-2 text-right" style={{ color: row.ot_hours > 0 ? "#b45309" : "var(--heading-color)" }}>{fmtHrs(row.ot_hours)}</td>
                <td className="px-3 py-2 text-right" style={{ color: "var(--module-context)" }}>{otPct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DrillHeadcount({ rows }: { rows: { department: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <div className="space-y-2">
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
        Headcount by Department
      </p>
      {rows.map(row => (
        <div key={row.department}>
          <div className="mb-1 flex justify-between">
            <span className="text-[0.8rem] font-medium" style={{ color: "var(--heading-color)" }}>{row.department}</span>
            <span className="text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{row.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
            <div className="h-full rounded-full" style={{ width: `${(row.count / total) * 100}%`, background: "linear-gradient(90deg,#1e3a5f,#2563eb)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── violations by manager summary table ──────────────────────────────────────

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

// ── all exceptions table ─────────────────────────────────────────────────────

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
      {/* header + filters */}
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

      {/* table */}
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

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: "var(--card-border)" }}>
          <span className="text-[0.75rem]" style={{ color: "var(--card-desc)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="rounded-[8px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="rounded-[8px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all disabled:opacity-40"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── OT donut chart ────────────────────────────────────────────────────────────

const LOCATION_COLORS: Record<string, string> = {
  "AAP":            "#2563eb",
  "API Scottsboro": "#0891b2",
  "API Memphis":    "#d97706",
};

function OtDonutChart({ locations }: { locations: { location: string; ot_hours: number }[] }) {
  const totalOt = locations.reduce((s, l) => s + l.ot_hours, 0);
  if (totalOt === 0) return null;

  const CX = 70, CY = 70, R = 50, SW = 20;
  const circumference = 2 * Math.PI * R;
  const GAP = 3;

  let accumulated = 0;
  const segments = locations
    .filter(l => l.ot_hours > 0)
    .map(l => {
      const len = Math.max((l.ot_hours / totalOt) * circumference - GAP, 1);
      const startAngle = -90 + (accumulated / circumference) * 360;
      accumulated += (l.ot_hours / totalOt) * circumference;
      return { ...l, len, startAngle, color: LOCATION_COLORS[l.location] ?? "#6b7280" };
    });

  return (
    <div className="rounded-[16px] px-5 py-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
        OT Hours by Location
      </p>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--tab-group-bg)" strokeWidth={SW} />
            {segments.map(seg => (
              <circle
                key={seg.location}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={SW}
                strokeDasharray={`${seg.len} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                transform={`rotate(${seg.startAngle} ${CX} ${CY})`}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[1.15rem] font-extrabold leading-none" style={{ color: "var(--heading-color)" }}>
              {totalOt.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>OT hrs</p>
          </div>
        </div>
        <div className="space-y-3">
          {segments.map(seg => (
            <div key={seg.location} className="flex items-start gap-2.5">
              <div className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
              <div>
                <p className="text-[0.8rem] font-semibold leading-tight" style={{ color: "var(--heading-color)" }}>{seg.location}</p>
                <p className="text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
                  {seg.ot_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })} hrs
                  {" · "}{((seg.ot_hours / totalOt) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── hours by location ─────────────────────────────────────────────────────────

type LocationHours = {
  location: string;
  regular_hours: number;
  ot_hours: number;
  departments: { department: string; regular_hours: number; ot_hours: number }[];
};

function HoursByLocation({ locations }: { locations: LocationHours[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mb-5">
      <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
        Hours by Location
      </p>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="shrink-0">
          <OtDonutChart locations={locations} />
        </div>
        <div className="grid flex-1 gap-3 grid-cols-1">
        {locations.map((loc) => {
          const isOpen = open === loc.location;
          const total = loc.regular_hours + loc.ot_hours;
          const otPct = total > 0 ? ((loc.ot_hours / total) * 100).toFixed(1) : "0.0";
          return (
            <div
              key={loc.location}
              className="overflow-hidden rounded-[16px]"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : loc.location)}
                className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-all hover:bg-black/[0.02]"
              >
                <div>
                  <p className="text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{loc.location}</p>
                  <div className="mt-2 flex gap-4">
                    <div>
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Regular</p>
                      <p className="text-[1.1rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{loc.regular_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>OT</p>
                      <p className="text-[1.1rem] font-extrabold leading-tight" style={{ color: "#b45309" }}>{loc.ot_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>OT %</p>
                      <p className="text-[1.1rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{otPct}%</p>
                    </div>
                  </div>
                </div>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className={cn("mt-1 shrink-0 transition-transform duration-200", isOpen && "rotate-90")} style={{ color: "var(--card-desc)" }}>
                  <path d="M3 1.5L7 5L3 8.5" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t px-4 pb-3 pt-2" style={{ borderColor: "var(--card-border)" }}>
                  <table className="w-full text-[0.74rem]">
                    <thead>
                      <tr>
                        <th className="pb-1.5 text-left font-bold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)", fontSize: "0.6rem" }}>Department</th>
                        <th className="pb-1.5 text-right font-bold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)", fontSize: "0.6rem" }}>Reg</th>
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
      </div>
    </div>
  );
}

// ── upload bar ────────────────────────────────────────────────────────────────

function UploadBar({ onUploaded }: { onUploaded: () => void }) {
  const [weekLabel, setWeekLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleClearAll() {
    if (!confirm("Delete all WOSH reports? This cannot be undone.")) return;
    setClearing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await executiveApi.clearWosh();
      setSuccess(`Cleared ${res.deleted} report${res.deleted !== 1 ? "s" : ""}. Ready for fresh uploads.`);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed.");
    } finally {
      setClearing(false);
    }
  }

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
    <div
      className="mb-5 rounded-[14px] px-5 py-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
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
            <button
              onClick={handleClearAll}
              disabled={clearing || uploading}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[0.75rem] font-semibold transition-all disabled:opacity-50"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--card-border)", color: "var(--module-context)" }}
            >
              {clearing ? "Clearing…" : "Clear All Reports"}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-[0.75rem] font-medium text-red-600">{error}</p>}
      {success && <p className="mt-2 text-[0.75rem] font-medium text-emerald-600">{success}</p>}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ExecutivePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeKpi, setActiveKpi] = useState<KpiId | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: dashData } = useSWR<ExecutiveDashboardData>(
    "executive-dashboard",
    () => executiveApi.dashboard()
  );
  const { data: history, mutate: mutateHistory } = useSWR<WoshReportMeta[]>(
    "wosh-history",
    () => executiveApi.woshHistory()
  );
  const { data: latestReport, mutate: mutateLatest } = useSWR<WoshReport | null>(
    "wosh-latest",
    () => executiveApi.woshLatest()
  );
  const { data: selectedReport } = useSWR<WoshReport>(
    selectedId !== null ? `wosh-${selectedId}` : null,
    () => executiveApi.woshById(selectedId!)
  );
  const { data: hoursLocData } = useSWR(
    "executive-hours-by-location",
    () => executiveApi.hoursByLocation()
  );

  if (user && !user.is_executive && !user.is_admin) {
    router.replace("/overview");
    return null;
  }

  const report = selectedId !== null ? selectedReport : latestReport;
  const pd = report?.parsed_data ?? null;
  const summary = pd?.summary;

  function handleKpi(id: KpiId) {
    setActiveKpi(prev => prev === id ? null : id);
  }

  function handleUploaded() {
    mutateHistory();
    mutateLatest();
  }

  // ── drill-down content ──────────────────────────────────────────────────────

  function renderDrillDown() {
    if (!activeKpi) return null;

    let content: React.ReactNode = null;

    switch (activeKpi) {
      case "violations":
        content = (
          <div className="grid gap-6 md:grid-cols-2">
            <DrillByManager data={pd?.chart.by_manager ?? []} />
            <DrillByDay data={pd?.chart.by_day ?? []} />
          </div>
        );
        break;
      case "employees":
        content = <DrillTopEmployees data={pd?.top_employees ?? []} />;
        break;
      case "early":
        content = (
          <div>
            <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
              Early Arrivals by Manager
            </p>
            <DrillByManager data={(pd?.chart.by_manager ?? []).filter(m => m.early_only + m.both > 0).map(m => ({ ...m, late_only: 0, both: 0, total: m.early_only + m.both }))} />
          </div>
        );
        break;
      case "late":
        content = (
          <div>
            <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
              Late Departures by Manager
            </p>
            <DrillByManager data={(pd?.chart.by_manager ?? []).filter(m => m.late_only + m.both > 0).map(m => ({ ...m, early_only: 0, both: 0, total: m.late_only + m.both }))} />
          </div>
        );
        break;
      case "total_emp":
        content = <DrillHeadcount rows={dashData?.headcount.by_department ?? []} />;
        break;
      case "reg_hours":
      case "ot_hours":
        content = <DrillHours rows={dashData?.hours_by_department ?? []} />;
        break;
    }

    return (
      <div
        className="mb-5 rounded-[14px] p-5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">

      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.5rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>
            Executive Summary
          </h1>
          {summary && (
            <p className="mt-1 text-[0.8rem]" style={{ color: "var(--card-desc)" }}>
              {report?.week_label && <span className="font-semibold" style={{ color: "var(--heading-color)" }}>{report.week_label} · </span>}
              {summary.generated_text && (
                <span>{summary.total_violations} irregularities · {summary.employees_affected} employees · {summary.managers} managers</span>
              )}
            </p>
          )}
        </div>

        {/* Week selector */}
        {history && history.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-[0.72rem] font-semibold" style={{ color: "var(--module-context)" }}>Week:</label>
            <select
              value={selectedId ?? ""}
              onChange={e => setSelectedId(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-[10px] px-3 py-1.5 text-[0.78rem]"
              style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }}
            >
              <option value="">Latest</option>
              {history.map(r => (
                <option key={r.id} value={r.id}>
                  {r.week_label ?? `Report #${r.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Upload bar — HR admins only (must be both HR track and admin) */}
      {(user?.is_admin && user?.tracks?.includes("hr")) && <UploadBar onUploaded={handleUploaded} />}

      {/* Hours by location */}
      {hoursLocData && hoursLocData.locations.length > 0 && (
        <HoursByLocation locations={hoursLocData.locations} />
      )}

      {/* KPI row — WOSH violations */}
      {summary ? (
        <>
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
            Shift Exceptions
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <KpiCard id="violations" label="Total Irregularities" value={fmtNum(summary.total_violations)} active={activeKpi === "violations"} onClick={handleKpi} />
            <KpiCard id="employees" label="Employees Affected" value={fmtNum(summary.employees_affected)} active={activeKpi === "employees"} onClick={handleKpi} />
            <KpiCard id="early" label="Early Arrivals" value={fmtNum(summary.early_arrivals)} active={activeKpi === "early"} onClick={handleKpi} accent="linear-gradient(135deg,#1e40af 0%,#3b82f6 82%)" />
            <KpiCard id="late" label="Late Departures" value={fmtNum(summary.late_departures)} active={activeKpi === "late"} onClick={handleKpi} accent="linear-gradient(135deg,#92400e 0%,#f59e0b 82%)" />
          </div>
        </>
      ) : (
        <div className="mb-3 rounded-[14px] py-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>No WOSH report uploaded yet</p>
          <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>Upload a Shift_Exception_Report.xlsx above to see violation data.</p>
        </div>
      )}

      {/* KPI row — company-wide */}
      <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
        Company Overview
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        <KpiCard
          id="total_emp"
          label="Total Employees"
          value={fmtNum(dashData?.headcount.total ?? 0)}
          sub={dashData ? `${dashData.headcount.managers} managers` : undefined}
          active={activeKpi === "total_emp"}
          onClick={handleKpi}
          accent="linear-gradient(135deg,#134e26 0%,#16a34a 82%)"
        />
        <KpiCard
          id="reg_hours"
          label="Regular Hours"
          value={fmtHrs(dashData?.totals.regular_hours ?? 0)}
          sub={dashData?.hours_date_range ?? undefined}
          active={activeKpi === "reg_hours"}
          onClick={handleKpi}
          accent="linear-gradient(135deg,#134e26 0%,#16a34a 82%)"
        />
        <KpiCard
          id="ot_hours"
          label="OT Hours"
          value={fmtHrs(dashData?.totals.ot_hours ?? 0)}
          sub={dashData && dashData.totals.regular_hours > 0
            ? `${((dashData.totals.ot_hours / (dashData.totals.regular_hours + dashData.totals.ot_hours)) * 100).toFixed(1)}% of total`
            : undefined}
          active={activeKpi === "ot_hours"}
          onClick={handleKpi}
          accent="linear-gradient(135deg,#92400e 0%,#d97706 82%)"
        />
      </div>

      {/* Drill-down panel */}
      {renderDrillDown()}

      {/* Violations by manager */}
      {pd?.chart.by_manager && pd.chart.by_manager.length > 0 && (
        <div className="mb-5">
          <ManagerSummaryTable data={pd.chart.by_manager} />
        </div>
      )}

      {/* All exceptions */}
      {pd?.exceptions && pd.exceptions.length > 0 && (
        <ExceptionsTable exceptions={pd.exceptions as WoshException[]} />
      )}
    </div>
  );
}
