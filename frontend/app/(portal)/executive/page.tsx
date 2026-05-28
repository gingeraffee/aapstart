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
  ShiftAdherenceData,
  ManagerAdherence,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── helpers ────────────────────────────────────────────────────────────────────

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

// ── helpers ──────────────────────────────────────────────────────────────────

function shortWeekLabel(label: string | null): string {
  if (!label) return "?";
  // "Week of May 11–15, 2026" → "May 11"
  const m = label.match(/([A-Za-z]+ \d+)/);
  return m ? m[1] : label.slice(0, 8);
}

// ── WOSH trend chart (Recharts) ───────────────────────────────────────────────

function WoshTrendChart({
  history,
  activeId,
  onSelect,
}: {
  history: WoshReportMeta[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
}) {
  if (history.length < 2) return null;

  // Sort by week_start ASCENDING so oldest is leftmost on the chart
  const sorted = [...history].sort((a, b) =>
    (a.week_start ?? "").localeCompare(b.week_start ?? "")
  );

  const data = sorted.map(h => ({
    id: h.id,
    label: h.week_label ?? `Report #${h.id}`,
    shortLabel: shortWeekLabel(h.week_label),
    violations: h.parsed_data?.summary?.total_violations ?? 0,
    early: h.parsed_data?.summary?.early_arrivals ?? 0,
    late: h.parsed_data?.summary?.late_departures ?? 0,
    isActive: h.id === activeId,
  }));

  return (
    <div
      className="mb-5 rounded-[14px] px-5 pt-4 pb-2"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
          Irregularities Trend
        </p>
        <span className="text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
          {history.length} week{history.length !== 1 ? "s" : ""} · click a bar to select
        </span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
          onClick={(e) => {
            if (e?.activePayload?.[0]) {
              const id = e.activePayload[0].payload.id as number;
              onSelect(id);
            }
          }}
        >
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 10, fill: "var(--card-desc)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--card-desc)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(v: number) => v.toLocaleString("en-US")}
          />
          <Tooltip
            cursor={{ fill: "var(--tab-group-bg)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as typeof data[0];
              return (
                <div
                  className="rounded-[10px] px-3 py-2 shadow-lg text-[0.72rem]"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                >
                  <p className="font-semibold mb-0.5" style={{ color: "var(--heading-color)" }}>{d.label}</p>
                  <p style={{ color: "var(--module-context)" }}>{d.violations} irregularities</p>
                  <p className="mt-0.5">
                    <span style={{ color: "#3b82f6" }}>Early {d.early}</span>
                    {" · "}
                    <span style={{ color: "#f59e0b" }}>Late {d.late}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="violations" radius={[4, 4, 0, 0]} cursor="pointer" maxBarSize={60}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.isActive ? "#2563eb" : "#cbd5e1"}
                stroke={entry.isActive ? "#1d4ed8" : "#94a3b8"}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  id, label, value, sub, active, onClick, accent, delta,
}: {
  id: KpiId; label: string; value: string | number; sub?: string;
  active: boolean; onClick: (id: KpiId) => void; accent?: string;
  delta?: number;
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
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <p className="text-[1.5rem] font-bold leading-none" style={{ color: active ? "#fff" : "var(--heading-color)" }}>
          {value}
        </p>
        {delta !== undefined && delta !== 0 && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold"
            style={{
              background: delta > 0
                ? (active ? "rgba(255,255,255,0.15)" : "rgba(239,68,68,0.12)")
                : (active ? "rgba(255,255,255,0.15)" : "rgba(34,197,94,0.12)"),
              color: delta > 0
                ? (active ? "#fca5a5" : "#dc2626")
                : (active ? "#86efac" : "#16a34a"),
            }}
          >
            {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}
          </span>
        )}
      </div>
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

// ── Data status bar ───────────────────────────────────────────────────────────

function DataStatusBar({
  historyCount,
  latestUploadedAt,
  hoursDateRange,
}: {
  historyCount: number;
  latestUploadedAt: string | null;
  hoursDateRange: string | null;
}) {
  const woshDaysAgo = latestUploadedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(latestUploadedAt).getTime()) / 86400000))
    : null;

  type Color = "blue" | "green" | "amber" | "gray" | "red";
  const chips: { label: string; color: Color }[] = [
    { label: `${historyCount} WOSH ${historyCount === 1 ? "report" : "reports"}`, color: historyCount > 0 ? "blue" : "gray" },
    ...(woshDaysAgo !== null ? [{
      label: woshDaysAgo === 0 ? "Uploaded today" : woshDaysAgo === 1 ? "Uploaded yesterday" : `WOSH: ${woshDaysAgo}d ago`,
      color: (woshDaysAgo <= 7 ? "green" : "amber") as Color,
    }] : []),
    ...(hoursDateRange
      ? [{ label: `Hours: ${hoursDateRange}`, color: "green" as Color }]
      : [{ label: "No hours imported", color: "red" as Color }]
    ),
  ];

  const COLORS: Record<Color, { bg: string; text: string }> = {
    blue:  { bg: "rgba(37,99,235,0.1)",   text: "#1d4ed8" },
    green: { bg: "rgba(22,163,74,0.1)",   text: "#15803d" },
    amber: { bg: "rgba(217,119,6,0.1)",   text: "#b45309" },
    gray:  { bg: "var(--tab-group-bg)",   text: "var(--card-desc)" },
    red:   { bg: "rgba(239,68,68,0.1)",   text: "#dc2626" },
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((chip, i) => {
        const c = COLORS[chip.color];
        return (
          <span
            key={i}
            className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold"
            style={{ background: c.bg, color: c.text }}
          >
            {chip.label}
          </span>
        );
      })}
    </div>
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

// ── Manager summary table ─────────────────────────────────────────────────────

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

// ── All exceptions table ──────────────────────────────────────────────────────

const EXCEPTION_TYPE_COLORS: Record<string, string> = {
  "Early": "bg-blue-50 text-blue-700",
  "Late": "bg-amber-50 text-amber-700",
  "Early & Late": "bg-red-50 text-red-700",
};

function ExceptionsTable({ exceptions }: { exceptions: WoshException[] }) {
  const [collapsed, setCollapsed] = useState(true);
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
      {/* header row — always visible, click to toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex w-full items-center justify-between gap-3 border-b px-5 py-4 text-left transition-colors hover:bg-black/[0.02]"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
            All Exceptions
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
            style={{ background: "var(--tab-group-bg)", color: "var(--module-context)" }}
          >
            {exceptions.length}
          </span>
          {!collapsed && (filtered.length !== exceptions.length) && (
            <span className="text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
              {filtered.length} shown
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
            {collapsed ? "Show details" : "Collapse"}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={cn("transition-transform duration-200", !collapsed && "rotate-180")}
            style={{ color: "var(--card-desc)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <>
          {/* filters */}
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--card-border)" }}>
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
        </>
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

// ── Hours by location ─────────────────────────────────────────────────────────

type LocationHours = {
  location: string;
  regular_hours: number;
  ot_hours: number;
  departments: { department: string; regular_hours: number; ot_hours: number }[];
};

function HoursByLocation({ locations }: { locations: LocationHours[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (locations.length === 0) {
    return (
      <div className="rounded-[14px] py-6 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <p className="text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>No hours data for this period</p>
        <p className="mt-1 text-[0.75rem]" style={{ color: "var(--card-desc)" }}>Hours may not have been imported for this pay period.</p>
      </div>
    );
  }

  return (
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
  );
}

// ── Upload bar ────────────────────────────────────────────────────────────────

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

// ── Section divider ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
      {children}
    </p>
  );
}

// ── Tab navigation ────────────────────────────────────────────────────────────

type TabId = "overview" | "wosh" | "hours" | "managers";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: "wosh",
    label: "Shift Exceptions",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "hours",
    label: "Hours & OT",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "managers",
    label: "Manager Performance",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    ),
  },
];

function TabNav({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <div
      className="mb-5 flex flex-wrap gap-1 overflow-hidden rounded-[14px] p-1"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
    >
      {TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-[0.78rem] font-semibold transition-all"
            style={{
              background: isActive ? "linear-gradient(135deg,#1e3a5f 0%,#2563eb 82%)" : "transparent",
              color: isActive ? "#fff" : "var(--module-context)",
              boxShadow: isActive ? "0 2px 8px rgba(37,99,235,0.25)" : "none",
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Manager adherence table ───────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 75) return "#65a30d";
  if (score >= 60) return "#ca8a04";
  if (score >= 40) return "#ea580c";
  return "#dc2626";
}

function ManagerAdherenceTable({ managers }: { managers: ManagerAdherence[] }) {
  if (managers.length === 0) {
    return (
      <div className="rounded-[14px] py-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>No manager data available</p>
        <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>Hours data must be imported for adherence scores to be calculated.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
        <h3 className="text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
          Manager Adherence Ranking
        </h3>
        <p className="mt-1 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
          Combined score from OT rate and unexcused absence rate. Higher is better.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
              <th className="px-4 py-3 text-left font-semibold w-10" style={{ color: "var(--module-context)" }}>#</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--module-context)" }}>Manager</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--module-context)" }}>Department</th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--module-context)" }}>Location</th>
              <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--module-context)" }}>Team</th>
              <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--module-context)" }}>OT Rate</th>
              <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--module-context)" }}>Absent Hrs</th>
              <th className="px-5 py-3 text-right font-semibold" style={{ color: "var(--module-context)" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m, i) => {
              const color = scoreColor(m.adherence_score);
              return (
                <tr key={m.manager_id} style={{ borderBottom: i < managers.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                  <td className="px-4 py-3 font-bold" style={{ color: "var(--module-context)" }}>{i + 1}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--heading-color)" }}>{m.manager_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--card-desc)" }}>{m.department ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--card-desc)" }}>{m.location}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--heading-color)" }}>{m.team_size}</td>
                  <td className="px-4 py-3 text-right" style={{ color: m.ot_rate > 5 ? "#b45309" : "var(--card-desc)" }}>
                    {m.ot_rate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: m.absent_w_point_hours > 0 ? "#dc2626" : "var(--card-desc)" }}>
                    {fmtHrs(m.absent_w_point_hours)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                        <div className="h-full rounded-full" style={{ width: `${m.adherence_score}%`, background: color }} />
                      </div>
                      <span className="font-bold text-[0.85rem]" style={{ color, minWidth: "36px", textAlign: "right" }}>
                        {m.adherence_score.toFixed(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Spotlight card (for Overview) ─────────────────────────────────────────────

function SpotlightCard({
  title,
  value,
  detail,
  accent,
}: {
  title: string;
  value: string;
  detail?: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-[14px] px-5 py-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
          {title}
        </p>
      </div>
      <p className="text-[1.15rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>{value}</p>
      {detail && <p className="mt-0.5 text-[0.75rem]" style={{ color: "var(--card-desc)" }}>{detail}</p>}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ExecutivePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [activeKpi, setActiveKpi] = useState<KpiId | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoursMode, setHoursMode] = useState<"week" | "range">("week");
  const [hoursFrom, setHoursFrom] = useState("");
  const [hoursTo, setHoursTo] = useState("");

  const { data: history, mutate: mutateHistory } = useSWR<WoshReportMeta[]>(
    "wosh-history",
    () => executiveApi.woshHistory()
  );

  // Sort by week_start DESCENDING (newest week first) — independent of upload time
  const weeks = useMemo(() => {
    if (!history) return [];
    return [...history].sort((a, b) =>
      (b.week_start ?? "").localeCompare(a.week_start ?? "")
    );
  }, [history]);

  // The report we show: explicitly-selected, or fall back to the newest week
  const effectiveReportId = selectedId !== null
    ? selectedId
    : (weeks[0]?.id ?? null);

  const { data: report, mutate: mutateReport } = useSWR<WoshReport>(
    effectiveReportId !== null ? `wosh-${effectiveReportId}` : null,
    () => executiveApi.woshById(effectiveReportId!)
  );

  const currentIndex = useMemo(() => {
    if (weeks.length === 0) return 0;
    if (selectedId === null) return 0;
    const idx = weeks.findIndex(r => r.id === selectedId);
    return idx === -1 ? 0 : idx;
  }, [weeks, selectedId]);

  function goOlder() {
    if (currentIndex >= weeks.length - 1) return;
    setSelectedId(weeks[currentIndex + 1].id);
  }

  function goNewer() {
    if (currentIndex <= 0) return;
    setSelectedId(weeks[currentIndex - 1].id);
  }

  const weekStartForHours = useMemo(() => {
    if (hoursMode !== "week" || weeks.length === 0) return null;
    if (selectedId === null) return weeks[0]?.week_start ?? null;
    return weeks.find(r => r.id === selectedId)?.week_start ?? null;
  }, [hoursMode, weeks, selectedId]);

  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(hoursFrom) ? hoursFrom : "";
  const validTo   = /^\d{4}-\d{2}-\d{2}$/.test(hoursTo)   ? hoursTo   : "";

  const timeFilterKey = hoursMode === "range"
    ? `range-${validFrom || "any"}-${validTo || "any"}`
    : `week-${weekStartForHours ?? "all"}`;
  const timeFilterParams = hoursMode === "range"
    ? { fromDate: validFrom || undefined, toDate: validTo || undefined }
    : { weekStart: weekStartForHours ?? undefined };

  const { data: dashData } = useSWR<ExecutiveDashboardData>(
    `executive-dashboard-${timeFilterKey}`,
    () => executiveApi.dashboard(timeFilterParams)
  );
  const { data: hoursLocData } = useSWR(
    `executive-hours-by-location-${timeFilterKey}`,
    () => executiveApi.hoursByLocation(timeFilterParams)
  );
  const { data: adherenceData } = useSWR<ShiftAdherenceData>(
    "executive-shift-adherence",
    () => executiveApi.shiftAdherence()
  );

  // Derived: spotlight data for Overview tab (must be above any conditional return)
  const topManagerByIrregularities = useMemo(() => {
    const rows = report?.parsed_data?.chart.by_manager ?? [];
    return [...rows].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [report]);

  const avgAdherenceScore = useMemo(() => {
    if (!adherenceData?.managers.length) return null;
    const sum = adherenceData.managers.reduce((s, m) => s + m.adherence_score, 0);
    return sum / adherenceData.managers.length;
  }, [adherenceData]);

  if (user && !user.is_executive && !user.is_admin) {
    router.replace("/overview");
    return null;
  }

  const pd = report?.parsed_data ?? null;
  const summary = pd?.summary;

  // Prior week's summary for delta — chronologically prior, sorted by week_start
  const prevSummary = currentIndex < weeks.length - 1
    ? weeks[currentIndex + 1]?.parsed_data?.summary ?? null
    : null;

  const woshDelta = summary && prevSummary
    ? {
        violations: summary.total_violations - prevSummary.total_violations,
        employees:  summary.employees_affected - prevSummary.employees_affected,
        early:      summary.early_arrivals - prevSummary.early_arrivals,
        late:       summary.late_departures - prevSummary.late_departures,
      }
    : null;

  function handleKpi(id: KpiId) {
    setActiveKpi(prev => prev === id ? null : id);
  }

  function handleUploaded() {
    mutateHistory();
    mutateReport();
  }

  // ── drill-down content ──────────────────────────────────────────────────────

  const WOSH_KPIS: KpiId[] = ["violations", "employees", "early", "late"];
  const OVERVIEW_KPIS: KpiId[] = ["total_emp", "reg_hours", "ot_hours"];

  function renderDrillDown(forKpis: KpiId[]) {
    if (!activeKpi || !forKpis.includes(activeKpi)) return null;

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

  // Week selector visibility (overview + wosh tabs only)
  const showWeekSelector = (activeTab === "overview" || activeTab === "wosh") && weeks.length >= 1;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.5rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>
              Executive Summary
            </h1>
            <DataStatusBar
              historyCount={weeks.length}
              latestUploadedAt={history?.[0]?.uploaded_at ?? null}
              hoursDateRange={dashData?.hours_date_range ?? null}
            />
          </div>

          {showWeekSelector && (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={goOlder}
                    disabled={currentIndex >= weeks.length - 1}
                    title="Previous week"
                    className="rounded-[8px] px-2.5 py-1.5 text-[0.78rem] font-bold transition-all disabled:opacity-25 hover:opacity-70"
                    style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}
                  >
                    ←
                  </button>
                  <select
                    value={selectedId ?? (weeks[0]?.id ?? "")}
                    onChange={e => setSelectedId(e.target.value === "" ? null : Number(e.target.value))}
                    className="rounded-[10px] px-3 py-1.5 text-[0.78rem]"
                    style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none", minWidth: "200px" }}
                  >
                    {weeks.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.week_label ?? `Report #${r.id}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={goNewer}
                    disabled={currentIndex <= 0}
                    title="Next week"
                    className="rounded-[8px] px-2.5 py-1.5 text-[0.78rem] font-bold transition-all disabled:opacity-25 hover:opacity-70"
                    style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {weeks.length > 1 && (
                  <span className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
                    {currentIndex + 1} of {weeks.length} weeks
                  </span>
                )}
                {woshDelta !== null && (
                  <span className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
                    · vs prior week
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload bar — HR admins only */}
      {(user?.is_admin && user?.tracks?.includes("hr")) && <UploadBar onUploaded={handleUploaded} />}

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <TabNav active={activeTab} onChange={setActiveTab} />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Hero KPIs — clickable, jump to relevant tab */}
          <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => setActiveTab("hours")}
              className="group rounded-[14px] px-4 py-4 text-left transition-all hover:shadow-md"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
            >
              <span className="mb-2 inline-block h-1 w-8 rounded-full" style={{ background: "#16a34a" }} />
              <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>Total Employees</p>
              <p className="mt-1 text-[1.6rem] font-bold leading-none" style={{ color: "var(--heading-color)" }}>
                {fmtNum(dashData?.headcount.total ?? 0)}
              </p>
              <p className="mt-1.5 text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
                {dashData?.headcount.managers ?? 0} managers
              </p>
            </button>

            <button
              onClick={() => setActiveTab("hours")}
              className="group rounded-[14px] px-4 py-4 text-left transition-all hover:shadow-md"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
            >
              <span className="mb-2 inline-block h-1 w-8 rounded-full" style={{ background: "#d97706" }} />
              <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>OT Hours</p>
              <p className="mt-1 text-[1.6rem] font-bold leading-none" style={{ color: "var(--heading-color)" }}>
                {fmtHrs(dashData?.totals.ot_hours ?? 0)}
              </p>
              <p className="mt-1.5 text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
                {dashData && dashData.totals.regular_hours > 0
                  ? `${((dashData.totals.ot_hours / (dashData.totals.regular_hours + dashData.totals.ot_hours)) * 100).toFixed(1)}% of total`
                  : "—"}
              </p>
            </button>

            <button
              onClick={() => setActiveTab("wosh")}
              className="group rounded-[14px] px-4 py-4 text-left transition-all hover:shadow-md"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
            >
              <span className="mb-2 inline-block h-1 w-8 rounded-full" style={{ background: "#ef4444" }} />
              <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>Irregularities</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <p className="text-[1.6rem] font-bold leading-none" style={{ color: "var(--heading-color)" }}>
                  {fmtNum(summary?.total_violations ?? 0)}
                </p>
                {woshDelta?.violations !== undefined && woshDelta.violations !== 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold" style={{
                    background: woshDelta.violations > 0 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                    color: woshDelta.violations > 0 ? "#dc2626" : "#16a34a",
                  }}>
                    {woshDelta.violations > 0 ? "▲" : "▼"}{Math.abs(woshDelta.violations)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
                {report?.week_label ?? "No report"}
              </p>
            </button>

            <button
              onClick={() => setActiveTab("managers")}
              className="group rounded-[14px] px-4 py-4 text-left transition-all hover:shadow-md"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
            >
              <span className="mb-2 inline-block h-1 w-8 rounded-full" style={{ background: "#2563eb" }} />
              <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>Top Manager</p>
              <p className="mt-1 text-[1.6rem] font-bold leading-none" style={{ color: "var(--heading-color)" }}>
                {adherenceData?.top_score?.toFixed(1) ?? "—"}
              </p>
              <p className="mt-1.5 text-[0.7rem] truncate" style={{ color: "var(--card-desc)" }}>
                {adherenceData?.top_manager ?? "No data"}
              </p>
            </button>
          </div>

          {/* Trend chart */}
          {weeks.length >= 2 && (
            <WoshTrendChart
              history={weeks}
              activeId={effectiveReportId}
              onSelect={setSelectedId}
            />
          )}

          {/* Two-column spotlight */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top managers by irregularities */}
            <div className="rounded-[14px] px-5 py-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
                  Top Managers · Irregularities
                </p>
                <button onClick={() => setActiveTab("wosh")} className="text-[0.7rem] font-semibold hover:underline" style={{ color: "#2563eb" }}>
                  View all →
                </button>
              </div>
              {topManagerByIrregularities.length === 0 ? (
                <p className="text-[0.78rem]" style={{ color: "var(--card-desc)" }}>No data for this week.</p>
              ) : (
                <DrillByManager data={topManagerByIrregularities} />
              )}
            </div>

            {/* OT by Location */}
            <div className="rounded-[14px] px-5 py-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
                  OT by Location
                </p>
                <button onClick={() => setActiveTab("hours")} className="text-[0.7rem] font-semibold hover:underline" style={{ color: "#2563eb" }}>
                  View all →
                </button>
              </div>
              {hoursLocData && hoursLocData.locations.length > 0 ? (
                <OtDonutChart locations={hoursLocData.locations} />
              ) : (
                <p className="text-[0.78rem]" style={{ color: "var(--card-desc)" }}>No hours data for this week.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SHIFT EXCEPTIONS TAB                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "wosh" && (
        <>
          {/* Trend chart — shown when 2+ weeks uploaded */}
          {weeks.length >= 2 && (
            <WoshTrendChart
              history={weeks}
              activeId={effectiveReportId}
              onSelect={setSelectedId}
            />
          )}

          {summary ? (
            <>
              <SectionLabel>Shift Exceptions{report?.week_label ? ` · ${report.week_label}` : ""}</SectionLabel>
              <div className="mb-3 flex flex-wrap gap-2">
                <KpiCard
                  id="violations"
                  label="Total Irregularities"
                  value={fmtNum(summary.total_violations)}
                  active={activeKpi === "violations"}
                  onClick={handleKpi}
                  delta={woshDelta?.violations}
                />
                <KpiCard
                  id="employees"
                  label="Employees Affected"
                  value={fmtNum(summary.employees_affected)}
                  active={activeKpi === "employees"}
                  onClick={handleKpi}
                  delta={woshDelta?.employees}
                />
                <KpiCard
                  id="early"
                  label="Early Arrivals"
                  value={fmtNum(summary.early_arrivals)}
                  active={activeKpi === "early"}
                  onClick={handleKpi}
                  accent="linear-gradient(135deg,#1e40af 0%,#3b82f6 82%)"
                  delta={woshDelta?.early}
                />
                <KpiCard
                  id="late"
                  label="Late Departures"
                  value={fmtNum(summary.late_departures)}
                  active={activeKpi === "late"}
                  onClick={handleKpi}
                  accent="linear-gradient(135deg,#92400e 0%,#f59e0b 82%)"
                  delta={woshDelta?.late}
                />
              </div>
            </>
          ) : (
            <div className="mb-3 rounded-[14px] py-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>No WOSH report uploaded yet</p>
              <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>Upload a Shift_Exception_Report.xlsx above to see exception data.</p>
            </div>
          )}

          {/* Drill-down panel for WOSH KPIs */}
          {renderDrillDown(WOSH_KPIS)}

          {/* Irregularities by manager */}
          {pd?.chart.by_manager && pd.chart.by_manager.length > 0 && (
            <div className="mb-5">
              <ManagerSummaryTable data={pd.chart.by_manager} />
            </div>
          )}

          {/* All exceptions (collapsed by default) */}
          {pd?.exceptions && pd.exceptions.length > 0 && (
            <div className="mb-8">
              <ExceptionsTable exceptions={pd.exceptions as WoshException[]} />
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HOURS & OT TAB                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "hours" && (
        <>
          <SectionLabel>Company Overview</SectionLabel>
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

          {/* Drill-down panel for Company Overview KPIs */}
          {renderDrillDown(OVERVIEW_KPIS)}

          {/* Hours by location */}
          <div className="mb-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
                Hours by Location
              </p>
              <div className="flex overflow-hidden rounded-[8px]" style={{ border: "1px solid var(--tab-group-border)" }}>
                {(["week", "range"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setHoursMode(m)}
                    className="px-2.5 py-1 text-[0.7rem] font-semibold transition-all"
                    style={{
                      background: hoursMode === m ? "linear-gradient(135deg,#1e3a5f 0%,#2563eb 82%)" : "var(--tab-group-bg)",
                      color: hoursMode === m ? "#fff" : "var(--card-desc)",
                    }}
                  >
                    {m === "week" ? "By Week" : "Date Range"}
                  </button>
                ))}
              </div>
              {hoursMode === "week" && report?.week_label && (
                <span className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>{report.week_label}</span>
              )}
              {hoursMode === "range" && (
                <>
                  <input
                    type="date"
                    value={hoursFrom}
                    onChange={e => setHoursFrom(e.target.value)}
                    className="rounded-[8px] px-2 py-1 text-[0.75rem]"
                    style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }}
                  />
                  <span className="text-[0.72rem] font-semibold" style={{ color: "var(--card-desc)" }}>–</span>
                  <input
                    type="date"
                    value={hoursTo}
                    onChange={e => setHoursTo(e.target.value)}
                    className="rounded-[8px] px-2 py-1 text-[0.75rem]"
                    style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }}
                  />
                </>
              )}
            </div>
            {hoursLocData && <HoursByLocation locations={hoursLocData.locations} />}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MANAGER PERFORMANCE TAB                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "managers" && (
        <>
          <SectionLabel>Manager Performance</SectionLabel>

          {/* Stats row */}
          <div className="mb-5 grid grid-cols-2 md:grid-cols-3 gap-2">
            <SpotlightCard
              title="Total Managers"
              value={fmtNum(adherenceData?.managers.length ?? 0)}
              accent="#2563eb"
            />
            <SpotlightCard
              title="Average Score"
              value={avgAdherenceScore !== null ? avgAdherenceScore.toFixed(1) : "—"}
              detail={avgAdherenceScore !== null ? `Across ${adherenceData?.managers.length ?? 0} managers` : undefined}
              accent={avgAdherenceScore !== null ? scoreColor(avgAdherenceScore) : "#94a3b8"}
            />
            <SpotlightCard
              title="Top Performer"
              value={adherenceData?.top_score?.toFixed(1) ?? "—"}
              detail={adherenceData?.top_manager ?? undefined}
              accent="#16a34a"
            />
          </div>

          {/* Adherence table */}
          {adherenceData && <ManagerAdherenceTable managers={adherenceData.managers} />}

          <p className="mt-3 text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
            Score = (1 − OT rate) × (1 − absence rate) × 100. Based on cumulative hours data.
          </p>
        </>
      )}

    </div>
  );
}
