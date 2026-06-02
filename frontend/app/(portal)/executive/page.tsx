"use client";

import { useState, useMemo } from "react";
import { useRef } from "react";
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
  PTOAnalyticsData,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number) { return n.toLocaleString("en-US"); }
function fmtHrs(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function shortWeekLabel(label: string | null): string {
  if (!label) return "?";
  const m = label.match(/([A-Za-z]+ \d+)/);
  return m ? m[1] : label.slice(0, 8);
}
function scoreColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 75) return "#65a30d";
  if (score >= 60) return "#ca8a04";
  if (score >= 40) return "#ea580c";
  return "var(--accent)";
}

// ── month helpers ─────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// ── WoshTrendChart (weekly) ───────────────────────────────────────────────────

function WoshTrendChart({
  history, activeId, onSelect,
}: {
  history: WoshReportMeta[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
}) {
  if (history.length < 2) return null;
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
    <ResponsiveContainer width="100%" height={140}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
        onClick={(e) => {
          if (e?.activePayload?.[0]) onSelect(e.activePayload[0].payload.id as number);
        }}
      >
        <XAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: "var(--module-context)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--module-context)" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString("en-US")} />
        <Tooltip
          cursor={{ fill: "var(--tab-group-bg)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as typeof data[0];
            return (
              <div className="rounded-[10px] px-3 py-2 shadow-lg text-[0.72rem]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <p className="font-semibold mb-0.5" style={{ color: "var(--heading-color)" }}>{d.label}</p>
                <p style={{ color: "var(--module-context)" }}>{d.violations} irregularities</p>
                <p className="mt-0.5"><span style={{ color: "#0f7fb3" }}>Early {d.early}</span>{" · "}<span style={{ color: "#d97706" }}>Late {d.late}</span></p>
              </div>
            );
          }}
        />
        <Bar dataKey="violations" radius={[4, 4, 0, 0]} cursor="pointer" maxBarSize={52}>
          {data.map((entry) => (
            <Cell key={entry.id}
              fill={entry.isActive ? "#0f7fb3" : "var(--tab-group-bg)"}
              stroke={entry.isActive ? "#17365d" : "var(--tab-group-border)"}
              strokeWidth={1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── MonthlyTrendChart ─────────────────────────────────────────────────────────

function MonthlyTrendChart({
  history, activeMonthKey,
}: {
  history: WoshReportMeta[];
  activeMonthKey: string; // "2026-05"
}) {
  // group by YYYY-MM, sum violations
  const byMonth = new Map<string, number>();
  for (const w of history) {
    if (!w.week_start) continue;
    const key = w.week_start.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + (w.parsed_data?.summary?.total_violations ?? 0));
  }
  const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  if (sorted.length < 2) return null;

  const data = sorted.map(([key, violations]) => {
    const [y, m] = key.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
    return { key, label, violations, isActive: key === activeMonthKey };
  });

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--module-context)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--module-context)" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString("en-US")} />
        <Tooltip
          cursor={{ fill: "var(--tab-group-bg)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as typeof data[0];
            return (
              <div className="rounded-[10px] px-3 py-2 shadow-lg text-[0.72rem]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <p className="font-semibold" style={{ color: "var(--heading-color)" }}>{d.label}</p>
                <p style={{ color: "var(--module-context)" }}>{d.violations} total irregularities</p>
              </div>
            );
          }}
        />
        <Bar dataKey="violations" radius={[4, 4, 0, 0]} maxBarSize={52}>
          {data.map((entry) => (
            <Cell key={entry.key}
              fill={entry.isActive ? "#0f7fb3" : "var(--tab-group-bg)"}
              stroke={entry.isActive ? "#17365d" : "var(--tab-group-border)"}
              strokeWidth={1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── OverviewKpiCard ───────────────────────────────────────────────────────────

type KpiAccent = "red" | "amber" | "blue" | "green";

function OverviewKpiCard({
  label, value, delta, deltaDir, sub, accent, onClick,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaDir?: "up" | "down" | "flat";
  sub?: string;
  accent: KpiAccent;
  onClick?: () => void;
}) {
  const accentGradients: Record<KpiAccent, string> = {
    red:   "linear-gradient(90deg,#9b001e,var(--accent))",
    amber: "linear-gradient(90deg,#b45309,#f59e0b)",
    blue:  "linear-gradient(90deg,#17365d,#0f7fb3)",
    green: "linear-gradient(90deg,#15803d,#22c55e)",
  };
  const valueColors: Record<KpiAccent, string> = {
    red:   "var(--accent)",
    amber: "#d97706",
    blue:  "var(--heading-color)",
    green: "#16a34a",
  };
  const deltaStyles = {
    up:   { background: "rgba(223,0,48,0.10)",   color: "var(--accent)" },
    down: { background: "rgba(22,163,74,0.10)",  color: "#16a34a" },
    flat: { background: "var(--tab-group-bg)",   color: "var(--module-context)" },
  };

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[14px] px-5 py-4 text-left transition-all",
        onClick && "cursor-pointer hover:shadow-md"
      )}
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
    >
      <span className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentGradients[accent] }} />
      <p className="mb-2.5 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>{label}</p>
      <p className="text-[2rem] font-bold leading-none" style={{ color: valueColors[accent], letterSpacing: "-1px" }}>{value}</p>
      {delta && deltaDir && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-bold" style={deltaStyles[deltaDir]}>
          {delta}
        </span>
      )}
      {sub && !delta && <p className="mt-1.5 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>{sub}</p>}
    </Tag>
  );
}

// ── TopExceptionsByManager (overview card) ────────────────────────────────────

function TopExceptionsByManager({ data }: { data: WoshByManagerChart[] }) {
  if (data.length === 0) {
    return <p className="text-[0.78rem] py-2" style={{ color: "var(--card-desc)" }}>No data for this period.</p>;
  }
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.slice(0, 5).map((row, i) => (
        <div key={row.manager} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-[0.68rem] font-bold" style={{ color: "var(--card-desc)" }}>{i + 1}</span>
          <span className="flex-1 truncate text-[0.8rem] font-semibold" style={{ color: "var(--heading-color)" }}>{row.manager}</span>
          <div className="w-20 h-[5px] rounded-full overflow-hidden flex-shrink-0" style={{ background: "var(--tab-group-bg)" }}>
            <div className="h-full rounded-full" style={{ width: `${(row.total / max) * 100}%`, background: "linear-gradient(90deg,#17365d,#0f7fb3)" }} />
          </div>
          <span className="min-w-[20px] text-right text-[0.8rem] font-bold" style={{ color: i === 0 ? "var(--accent)" : "var(--heading-color)" }}>{row.total}</span>
        </div>
      ))}
    </div>
  );
}

// ── HoursByLocationDept (overview card) ──────────────────────────────────────

type LocationHours = {
  location: string;
  regular_hours: number;
  ot_hours: number;
  departments: { department: string; regular_hours: number; ot_hours: number }[];
};

const LOCATION_COLORS: Record<string, string> = {
  "AAP":            "#1b2c56",
  "API Scottsboro": "#0891b2",
  "API Memphis":    "#d97706",
};
function locColor(loc: string) { return LOCATION_COLORS[loc] ?? "#4f6787"; }

function HoursByLocationDept({ locations }: { locations: LocationHours[] }) {
  if (locations.length === 0) {
    return <p className="text-[0.78rem] py-4 text-center" style={{ color: "var(--card-desc)" }}>No hours data for this period.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {locations.map(loc => {
        const total = loc.regular_hours + loc.ot_hours;
        return (
          <div key={loc.location}>
            {/* location header */}
            <div className="flex items-center justify-between rounded-[8px] px-3 py-2 mb-1"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)" }}>
              <span className="flex items-center gap-2 text-[0.78rem] font-bold" style={{ color: "var(--brand-deep,#1b2c56)" }}>
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: locColor(loc.location) }} />
                {loc.location}
              </span>
              <div className="flex items-center gap-2">
                {loc.ot_hours > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[0.68rem] font-bold" style={{ background: "rgba(180,83,9,0.10)", color: "#b45309" }}>
                    OT {fmtHrs(loc.ot_hours)}h
                  </span>
                )}
                <span className="text-[0.78rem] font-bold" style={{ color: "var(--heading-color)" }}>{fmtHrs(total)} hrs</span>
              </div>
            </div>
            {/* departments */}
            {loc.departments.map((dept, i) => {
              const deptTotal = dept.regular_hours + dept.ot_hours;
              const regPct = deptTotal > 0 ? (dept.regular_hours / deptTotal) * 100 : 0;
              const otPctDept = deptTotal > 0 ? (dept.ot_hours / deptTotal) * 100 : 0;
              return (
                <div key={dept.department}
                  className="flex items-center gap-2 py-1.5 pl-5 pr-2"
                  style={{ borderBottom: i < loc.departments.length - 1 ? "1px solid var(--tab-group-bg)" : "none" }}>
                  <span className="flex-1 text-[0.75rem] font-medium" style={{ color: "var(--module-context)" }}>{dept.department}</span>
                  <div className="flex h-[5px] rounded-full overflow-hidden flex-shrink-0" style={{ width: 80 }}>
                    <div style={{ width: `${regPct}%`, background: "#0f7fb3" }} />
                    <div style={{ width: `${otPctDept}%`, background: "#f59e0b" }} />
                  </div>
                  <span className="min-w-[52px] text-right text-[0.72rem] font-semibold" style={{ color: "var(--card-desc)" }}>{fmtHrs(deptTotal)}</span>
                  {dept.ot_hours > 0 && (
                    <span className="min-w-[36px] text-right text-[0.72rem] font-semibold" style={{ color: "#d97706" }}>+{fmtHrs(dept.ot_hours)}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── ManagerComplianceCard (overview) ─────────────────────────────────────────

function ManagerComplianceCard({ managers }: { managers: ManagerAdherence[] }) {
  if (managers.length === 0) {
    return <p className="text-[0.78rem] py-2" style={{ color: "var(--card-desc)" }}>No manager data available.</p>;
  }
  return (
    <div className="flex flex-col divide-y" style={{ borderColor: "var(--tab-group-bg)" }}>
      {managers.slice(0, 5).map((m) => {
        const color = scoreColor(m.adherence_score);
        return (
          <div key={m.manager_id} className="flex items-center gap-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold"
              style={{ background: `${color}18`, color, border: `2px solid ${color}40` }}>
              {m.adherence_score.toFixed(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[0.8rem] font-semibold" style={{ color: "var(--heading-color)" }}>{m.manager_name}</p>
              <p className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
                {m.department ?? m.location} · {m.ot_rate.toFixed(1)}% OT
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── HourAllocationsChart (hours tab) ─────────────────────────────────────────

type HourAllocationRow = {
  location: string;
  department: string;
  regular: number;
  ot: number;
  total: number;
};

function HourAllocationsChart({ rows, subtitle }: { rows: HourAllocationRow[]; subtitle?: string }) {
  if (rows.length === 0) {
    return (
      <div className="mb-5 rounded-[14px] py-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
        <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>No hours data for this period</p>
        <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>Upload weekly Payclock hours to see allocations.</p>
      </div>
    );
  }
  const totalRegular = rows.reduce((s, r) => s + r.regular, 0);
  const totalOt = rows.reduce((s, r) => s + r.ot, 0);
  const grandTotal = totalRegular + totalOt;
  const chartHeight = Math.min(Math.max(rows.length * 30 + 40, 200), 520);
  const chartData = rows.map(r => ({ ...r, name: `${r.location} · ${r.department}` }));

  return (
    <div className="mb-5 rounded-[14px] px-5 pt-4 pb-3" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>Hour Allocations</p>
          {subtitle && <p className="mt-0.5 text-[0.7rem]" style={{ color: "var(--card-desc)" }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
          <span><span style={{ color: "#0f7fb3" }}>■</span> Regular {fmtHrs(totalRegular)}</span>
          <span><span style={{ color: "#d97706" }}>■</span> OT {fmtHrs(totalOt)}</span>
          <span className="font-semibold" style={{ color: "var(--heading-color)" }}>Total {fmtHrs(grandTotal)}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: "var(--module-context)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--module-context)" }} axisLine={false} tickLine={false} width={180} />
          <Tooltip
            cursor={{ fill: "var(--tab-group-bg)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as typeof chartData[0];
              const pct = grandTotal > 0 ? ((d.total / grandTotal) * 100).toFixed(1) : "0.0";
              return (
                <div className="rounded-[10px] px-3 py-2 shadow-lg text-[0.72rem]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  <p className="font-semibold mb-0.5" style={{ color: "var(--heading-color)" }}>{d.location} · {d.department}</p>
                  <p><span style={{ color: "#0f7fb3" }}>Regular:</span> {fmtHrs(d.regular)} hrs</p>
                  <p><span style={{ color: "#d97706" }}>OT:</span> {fmtHrs(d.ot)} hrs</p>
                  <p className="mt-1 font-semibold" style={{ color: "var(--heading-color)" }}>Total: {fmtHrs(d.total)} hrs ({pct}%)</p>
                </div>
              );
            }}
          />
          <Bar dataKey="regular" stackId="a" fill="#0f7fb3" radius={[3, 0, 0, 3]} />
          <Bar dataKey="ot" stackId="a" fill="#d97706" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Drill-down panels (wosh + hours tabs) ─────────────────────────────────────

function DrillByManager({ data }: { data: WoshByManagerChart[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="space-y-2">
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>Irregularities by Manager</p>
      {data.map(row => (
        <div key={row.manager}>
          <div className="mb-1 flex items-center justify-between gap-4">
            <span className="text-[0.8rem] font-medium truncate" style={{ color: "var(--heading-color)" }}>{row.manager}</span>
            <span className="shrink-0 text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{row.total}</span>
          </div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
            {row.early_only > 0 && <div className="h-full rounded-l-full" style={{ width: `${(row.early_only / max) * 100}%`, background: "#0f7fb3" }} title={`Early: ${row.early_only}`} />}
            {row.late_only > 0 && <div className="h-full" style={{ width: `${(row.late_only / max) * 100}%`, background: "#f59e0b" }} title={`Late: ${row.late_only}`} />}
            {row.both > 0 && <div className="h-full rounded-r-full" style={{ width: `${(row.both / max) * 100}%`, background: "var(--accent)" }} title={`Both: ${row.both}`} />}
          </div>
          <div className="mt-0.5 flex gap-3 text-[0.67rem]" style={{ color: "var(--card-desc)" }}>
            <span style={{ color: "#0f7fb3" }}>Early {row.early_only}</span>
            <span style={{ color: "#f59e0b" }}>Late {row.late_only}</span>
            <span style={{ color: "var(--accent)" }}>Both {row.both}</span>
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
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>By Day of Week</p>
      {data.map(row => (
        <div key={row.day} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-[0.78rem] font-semibold" style={{ color: "var(--heading-color)" }}>{row.day}</span>
          <div className="flex-1 h-2 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
            <div className="h-full rounded-full" style={{ width: `${(row.count / max) * 100}%`, background: "linear-gradient(90deg,#17365d,#0f7fb3)" }} />
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
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>Top Employees by Irregularities</p>
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
                <td className="px-3 py-2 text-right" style={{ color: "#0f7fb3" }}>{row.early}</td>
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
            const otPct = row.regular_hours + row.ot_hours > 0 ? ((row.ot_hours / (row.regular_hours + row.ot_hours)) * 100).toFixed(1) : "0.0";
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
      <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>Headcount by Department</p>
      {rows.map(row => (
        <div key={row.department}>
          <div className="mb-1 flex justify-between">
            <span className="text-[0.8rem] font-medium" style={{ color: "var(--heading-color)" }}>{row.department}</span>
            <span className="text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{row.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
            <div className="h-full rounded-full" style={{ width: `${(row.count / total) * 100}%`, background: "linear-gradient(90deg,#17365d,#0f7fb3)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Manager summary + exceptions tables (wosh tab) ────────────────────────────

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
              <th className="px-4 py-3 text-center font-semibold w-20" style={{ color: "#0f7fb3" }}>Early Only</th>
              <th className="px-4 py-3 text-center font-semibold w-20" style={{ color: "#f59e0b" }}>Late Only</th>
              <th className="px-4 py-3 text-center font-semibold w-16" style={{ color: "var(--accent)" }}>Both</th>
              <th className="px-4 py-3 text-center font-semibold w-16" style={{ color: "var(--module-context)" }}>Total</th>
              <th className="px-5 py-3 text-left font-semibold" style={{ color: "var(--module-context)" }}>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.manager} style={{ borderBottom: i < data.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                <td className="px-5 py-3 font-semibold" style={{ color: "var(--heading-color)" }}>{row.manager}</td>
                <td className="px-4 py-3 text-center" style={{ color: "#0f7fb3" }}>{row.early_only}</td>
                <td className="px-4 py-3 text-center" style={{ color: "#f59e0b" }}>{row.late_only}</td>
                <td className="px-4 py-3 text-center" style={{ color: "var(--accent)" }}>{row.both}</td>
                <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--heading-color)" }}>{row.total}</td>
                <td className="px-5 py-3 min-w-[120px]">
                  <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                    {row.early_only > 0 && <div style={{ width: `${(row.early_only / maxTotal) * 100}%`, background: "#0f7fb3" }} className="h-full" />}
                    {row.late_only > 0 && <div style={{ width: `${(row.late_only / maxTotal) * 100}%`, background: "#f59e0b" }} className="h-full" />}
                    {row.both > 0 && <div style={{ width: `${(row.both / maxTotal) * 100}%`, background: "var(--accent)" }} className="h-full rounded-r-full" />}
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

const EXCEPTION_TYPE_COLORS: Record<string, string> = {
  "Early":       "bg-blue-50 text-blue-700",
  "Late":        "bg-amber-50 text-amber-700",
  "Early & Late":"bg-red-50 text-red-700",
};

function ExceptionsTable({ exceptions }: { exceptions: WoshException[] }) {
  const [collapsed, setCollapsed] = useState(true);
  const [filterManager, setFilterManager] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const managers = useMemo(() => Array.from(new Set(exceptions.map(e => e.Manager).filter(Boolean) as string[])).sort(), [exceptions]);
  const types = useMemo(() => Array.from(new Set(exceptions.map(e => e["Exception Type"]).filter(Boolean) as string[])).sort(), [exceptions]);

  const filtered = useMemo(() => exceptions.filter(e => {
    if (filterManager && e.Manager !== filterManager) return false;
    if (filterType && e["Exception Type"] !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e["Employee Name"] ?? "").toLowerCase().includes(q) || String(e["Employee #"] ?? "").includes(q);
    }
    return true;
  }), [exceptions, filterManager, filterType, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selStyle = {
    background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)",
    color: "var(--heading-color)", borderRadius: "10px", padding: "6px 10px", fontSize: "0.78rem", outline: "none",
  };

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex w-full items-center justify-between gap-3 border-b px-5 py-4 text-left transition-colors hover:bg-black/[0.02]"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>All Exceptions</h3>
          <span className="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold" style={{ background: "var(--tab-group-bg)", color: "var(--module-context)" }}>
            {exceptions.length}
          </span>
          {!collapsed && filtered.length !== exceptions.length && (
            <span className="text-[0.72rem]" style={{ color: "var(--card-desc)" }}>{filtered.length} shown</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.72rem]" style={{ color: "var(--card-desc)" }}>{collapsed ? "Show details" : "Collapse"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={cn("transition-transform duration-200", !collapsed && "rotate-180")} style={{ color: "var(--card-desc)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <>
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--card-border)" }}>
            <input type="text" placeholder="Search employee…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="flex-1 min-w-[140px]" style={{ ...selStyle, flex: "1 1 140px" }} />
            <select value={filterManager} onChange={e => { setFilterManager(e.target.value); setPage(0); }} style={selStyle}>
              <option value="">All Managers</option>
              {managers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0); }} style={selStyle}>
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filterManager || filterType || search) && (
              <button onClick={() => { setFilterManager(""); setFilterType(""); setSearch(""); setPage(0); }}
                className="rounded-[8px] px-2.5 py-1.5 text-[0.72rem] font-semibold transition-all hover:opacity-80"
                style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}>
                Clear
              </button>
            )}
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
                      <td className="px-3 py-2" style={{ color: row["Time Early"] ? "#0f7fb3" : "var(--card-desc)" }}>{row["Actual Clock In"] ?? "—"}</td>
                      <td className="px-3 py-2" style={{ color: row["Time Late"] ? "#b45309" : "var(--card-desc)" }}>{row["Actual Clock Out"] ?? "—"}</td>
                      <td className="px-3 py-2 font-medium" style={{ color: "#0f7fb3" }}>{row["Time Early"] ?? "—"}</td>
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
                  style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}>Prev</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="rounded-[8px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all disabled:opacity-40"
                  style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── OT donut + HoursByLocation (hours tab detail view) ────────────────────────

const LOC_COLORS: Record<string, string> = {
  "AAP":            "#0f7fb3",
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
  const segments = locations.filter(l => l.ot_hours > 0).map(l => {
    const len = Math.max((l.ot_hours / totalOt) * circumference - GAP, 1);
    const startAngle = -90 + (accumulated / circumference) * 360;
    accumulated += (l.ot_hours / totalOt) * circumference;
    return { ...l, len, startAngle, color: LOC_COLORS[l.location] ?? "#6b7280" };
  });

  return (
    <div className="rounded-[16px] px-5 py-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>OT Hours by Location</p>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--tab-group-bg)" strokeWidth={SW} />
            {segments.map(seg => (
              <circle key={seg.location} cx={CX} cy={CY} r={R} fill="none" stroke={seg.color} strokeWidth={SW}
                strokeDasharray={`${seg.len} ${circumference}`} strokeDashoffset={0} strokeLinecap="round"
                transform={`rotate(${seg.startAngle} ${CX} ${CY})`} />
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
                  {seg.ot_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })} hrs · {((seg.ot_hours / totalOt) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      <div className="shrink-0"><OtDonutChart locations={locations} /></div>
      <div className="grid flex-1 gap-3 grid-cols-1">
        {locations.map((loc) => {
          const isOpen = open === loc.location;
          const total = loc.regular_hours + loc.ot_hours;
          const otPct = total > 0 ? ((loc.ot_hours / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={loc.location} className="overflow-hidden rounded-[16px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <button onClick={() => setOpen(isOpen ? null : loc.location)}
                className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-all hover:bg-black/[0.02]">
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

// ── Time-off by location (PTO tab) ────────────────────────────────────────────

function PtoByLocation({ locations }: { locations: PTOAnalyticsData["locations"] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (locations.length === 0) {
    return (
      <div className="rounded-[14px] py-6 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <p className="text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>No time-off data</p>
        <p className="mt-1 text-[0.75rem]" style={{ color: "var(--card-desc)" }}>Hours must be imported for time-off analytics to appear.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 grid-cols-1">
      {locations.map((loc) => {
        const isOpen = open === loc.location;
        return (
          <div key={loc.location} className="overflow-hidden rounded-[16px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <button onClick={() => setOpen(isOpen ? null : loc.location)}
              className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-all hover:bg-black/[0.02]">
              <div>
                <p className="text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{loc.location}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Vacation</p>
                    <p className="text-[1.1rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{fmtHrs(loc.vacation_hours)}</p>
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Personal</p>
                    <p className="text-[1.1rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{fmtHrs(loc.personal_hours)}</p>
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Protected</p>
                    <p className="text-[1.1rem] font-extrabold leading-tight" style={{ color: "#0f7fb3" }}>{fmtHrs(loc.protected_hours)}</p>
                  </div>
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Total PTO</p>
                    <p className="text-[1.1rem] font-extrabold leading-tight" style={{ color: "var(--heading-color)" }}>{fmtHrs(loc.total_pto)}</p>
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
                      {["Department", "Vac", "Pers", "Prot", "Emp"].map((h, idx) => (
                        <th key={h} className={cn("pb-1.5 font-bold uppercase tracking-[0.08em]", idx === 0 ? "text-left" : "text-right")}
                          style={{ color: "var(--module-context)", fontSize: "0.6rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loc.departments.map((d) => (
                      <tr key={d.department} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                        <td className="py-1.5 font-medium" style={{ color: "var(--heading-color)" }}>{d.department}</td>
                        <td className="py-1.5 text-right" style={{ color: "var(--heading-color)" }}>{fmtHrs(d.vacation_hours)}</td>
                        <td className="py-1.5 text-right" style={{ color: "var(--heading-color)" }}>{fmtHrs(d.personal_hours)}</td>
                        <td className="py-1.5 text-right" style={{ color: d.protected_hours > 0 ? "#0f7fb3" : "var(--card-desc)" }}>{fmtHrs(d.protected_hours)}</td>
                        <td className="py-1.5 text-right" style={{ color: "var(--card-desc)" }}>{d.employee_count}</td>
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

// ── Manager adherence table (managers tab) ────────────────────────────────────

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
        <h3 className="text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>Manager Compliance Ranking</h3>
        <p className="mt-1 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>Combined score from OT rate, unexcused absences, and review past-due rate. Higher is better.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.78rem]">
          <thead>
            <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
              {["#", "Manager", "Department", "Location", "Team", "OT Rate", "Absent Hrs", "Reviews Past Due", "Score"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap" style={{ color: "var(--module-context)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {managers.map((m, i) => {
              const color = scoreColor(m.adherence_score);
              const reviewsTotal = m.reviews_total ?? 0;
              const reviewsPastDue = m.reviews_past_due ?? 0;
              return (
                <tr key={m.manager_id} style={{ borderBottom: i < managers.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                  <td className="px-4 py-3 font-bold" style={{ color: "var(--module-context)" }}>{i + 1}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--heading-color)" }}>{m.manager_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--card-desc)" }}>{m.department ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--card-desc)" }}>{m.location}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--heading-color)" }}>{m.team_size}</td>
                  <td className="px-4 py-3 text-right" style={{ color: m.ot_rate > 5 ? "#b45309" : "var(--card-desc)" }}>{m.ot_rate.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right" style={{ color: m.absent_w_point_hours > 0 ? "var(--accent)" : "var(--card-desc)" }}>{fmtHrs(m.absent_w_point_hours)}</td>
                  <td className="px-4 py-3 text-center">
                    {reviewsTotal === 0 ? (
                      <span style={{ color: "var(--card-desc)" }}>—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-bold"
                        style={{ background: reviewsPastDue > 0 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)", color: reviewsPastDue > 0 ? "var(--accent)" : "#16a34a" }}>
                        {reviewsPastDue} / {reviewsTotal}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                        <div className="h-full rounded-full" style={{ width: `${m.adherence_score}%`, background: color }} />
                      </div>
                      <span className="font-bold text-[0.85rem]" style={{ color, minWidth: "36px", textAlign: "right" }}>{m.adherence_score.toFixed(1)}</span>
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
    setClearing(true); setError(null); setSuccess(null);
    try {
      const res = await executiveApi.clearWosh();
      setSuccess(`Cleared ${res.deleted} report${res.deleted !== 1 ? "s" : ""}. Ready for fresh uploads.`);
      onUploaded();
    } catch (err) { setError(err instanceof Error ? err.message : "Clear failed."); }
    finally { setClearing(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null); setSuccess(null);
    try {
      const result = await executiveApi.uploadWosh(file, weekLabel);
      setSuccess(`Uploaded: ${result.week_label ?? "report"} — ${result.exceptions} exceptions across ${result.managers} managers`);
      setWeekLabel("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  return (
    <div className="mb-5 rounded-[14px] px-5 py-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>Upload WOSH Report</p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="text" placeholder="Week label (auto-detected if blank)" value={weekLabel} onChange={e => setWeekLabel(e.target.value)}
              className="rounded-[10px] px-3 py-2 text-[0.78rem] w-64"
              style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }} />
            <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls" onChange={handleFile} disabled={uploading} className="hidden" id="wosh-upload" />
            <label htmlFor="wosh-upload"
              className={cn("inline-flex cursor-pointer items-center gap-2 rounded-[10px] px-4 py-2 text-[0.78rem] font-semibold transition-all select-none", uploading && "opacity-50 cursor-not-allowed")}
              style={{ background: "linear-gradient(140deg,#17365d 0%,#0f7fb3 74%,#21b8e7 100%)", color: "#fff" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploading ? "Uploading…" : "Choose File"}
            </label>
            <button onClick={handleClearAll} disabled={clearing || uploading}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[0.75rem] font-semibold transition-all disabled:opacity-50"
              style={{ background: "var(--tab-group-bg)", border: "1px solid var(--card-border)", color: "var(--module-context)" }}>
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

// ── Tab navigation ────────────────────────────────────────────────────────────

type TabId = "overview" | "wosh" | "hours" | "pto" | "managers";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Overview" },
  { id: "wosh",      label: "Shift Exceptions" },
  { id: "hours",     label: "Hours & OT" },
  { id: "pto",       label: "Time Off" },
  { id: "managers",  label: "Manager Compliance" },
];

function TabNav({ active, onChange, woshCount }: { active: TabId; onChange: (id: TabId) => void; woshCount?: number }) {
  return (
    <div className="mb-6 flex gap-0 overflow-x-auto" style={{ borderBottom: "2px solid var(--tab-group-border)" }}>
      {TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex shrink-0 items-center gap-2 px-5 py-2.5 text-[0.8rem] font-semibold transition-all"
            style={{
              color: isActive ? "var(--heading-color)" : "var(--module-context)",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-2px",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
            }}
          >
            {tab.label}
            {tab.id === "wosh" && woshCount !== undefined && woshCount > 0 && (
              <span className="rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold"
                style={{ background: "rgba(223,0,48,0.12)", color: "var(--accent)" }}>
                {woshCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Spotlight card (managers tab) ─────────────────────────────────────────────

function SpotlightCard({ title, value, detail, accent }: { title: string; value: string; detail?: string; accent: string }) {
  return (
    <div className="rounded-[14px] px-5 py-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>{title}</p>
      </div>
      <p className="text-[1.15rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>{value}</p>
      {detail && <p className="mt-0.5 text-[0.75rem]" style={{ color: "var(--card-desc)" }}>{detail}</p>}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>
      {children}
    </p>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExecutivePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");

  // weekly: selectedId null = latest
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // monthly: 0 = current month, 1 = 1 month ago, etc.
  const [monthOffset, setMonthOffset] = useState(0);

  // hours-tab custom date range
  const [hoursMode, setHoursMode] = useState<"week" | "range">("week");
  const [hoursFrom, setHoursFrom] = useState("");
  const [hoursTo, setHoursTo] = useState("");

  // ── WOSH history ──
  const { data: history, mutate: mutateHistory } = useSWR<WoshReportMeta[]>(
    "wosh-history", () => executiveApi.woshHistory()
  );

  const weeks = useMemo(() => {
    if (!history) return [];
    return [...history].sort((a, b) => (b.week_start ?? "").localeCompare(a.week_start ?? ""));
  }, [history]);

  // ── Monthly bounds ──
  const targetMonthDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  }, [monthOffset]);

  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthBounds(targetMonthDate.getFullYear(), targetMonthDate.getMonth()),
    [targetMonthDate]
  );
  const currentMonthLabel = useMemo(
    () => monthLabel(targetMonthDate.getFullYear(), targetMonthDate.getMonth()),
    [targetMonthDate]
  );
  const activeMonthKey = useMemo(
    () => `${targetMonthDate.getFullYear()}-${String(targetMonthDate.getMonth() + 1).padStart(2, "0")}`,
    [targetMonthDate]
  );

  // ── Selected week (weekly mode) ──
  const effectiveReportId = selectedId !== null ? selectedId : (weeks[0]?.id ?? null);
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

  const prevSummary = currentIndex < weeks.length - 1
    ? weeks[currentIndex + 1]?.parsed_data?.summary ?? null
    : null;

  // ── Monthly WOSH aggregation ──
  const weeksInMonth = useMemo(() => {
    if (!history) return [];
    return history.filter(w => {
      if (!w.week_start) return false;
      return w.week_start >= monthStart && w.week_start <= monthEnd;
    });
  }, [history, monthStart, monthEnd]);

  const monthlyWoshSummary = useMemo(() => {
    if (weeksInMonth.length === 0) return null;
    return weeksInMonth.reduce(
      (acc, w) => {
        const s = w.parsed_data?.summary;
        if (!s) return acc;
        return {
          total_violations: acc.total_violations + s.total_violations,
          employees_affected: acc.employees_affected + s.employees_affected,
          early_arrivals: acc.early_arrivals + s.early_arrivals,
          late_departures: acc.late_departures + s.late_departures,
        };
      },
      { total_violations: 0, employees_affected: 0, early_arrivals: 0, late_departures: 0 }
    );
  }, [weeksInMonth]);

  // ── Previous month WOSH (for deltas) ──
  const prevMonthDate = useMemo(() => new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() - 1, 1), [targetMonthDate]);
  const { start: prevMonthStart, end: prevMonthEnd } = useMemo(
    () => monthBounds(prevMonthDate.getFullYear(), prevMonthDate.getMonth()),
    [prevMonthDate]
  );
  const prevMonthlyWoshSummary = useMemo(() => {
    if (!history) return null;
    const prevWeeks = history.filter(w => w.week_start && w.week_start >= prevMonthStart && w.week_start <= prevMonthEnd);
    if (prevWeeks.length === 0) return null;
    return prevWeeks.reduce(
      (acc, w) => {
        const s = w.parsed_data?.summary;
        if (!s) return acc;
        return {
          total_violations: acc.total_violations + s.total_violations,
          employees_affected: acc.employees_affected + s.employees_affected,
          early_arrivals: acc.early_arrivals + s.early_arrivals,
          late_departures: acc.late_departures + s.late_departures,
        };
      },
      { total_violations: 0, employees_affected: 0, early_arrivals: 0, late_departures: 0 }
    );
  }, [history, prevMonthStart, prevMonthEnd]);

  // ── Hours API params ──
  const weekStartForHours = useMemo(() => {
    if (viewMode === "monthly" || hoursMode === "range") return null;
    if (selectedId === null) return weeks[0]?.week_start ?? null;
    return weeks.find(r => r.id === selectedId)?.week_start ?? null;
  }, [viewMode, hoursMode, weeks, selectedId]);

  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(hoursFrom) ? hoursFrom : "";
  const validTo   = /^\d{4}-\d{2}-\d{2}$/.test(hoursTo)   ? hoursTo   : "";

  const timeFilterKey = useMemo(() => {
    if (viewMode === "monthly") return `range-${monthStart}-${monthEnd}`;
    if (hoursMode === "range")  return `range-${validFrom || "any"}-${validTo || "any"}`;
    return `week-${weekStartForHours ?? "all"}`;
  }, [viewMode, hoursMode, monthStart, monthEnd, weekStartForHours, validFrom, validTo]);

  const timeFilterParams = useMemo(() => {
    if (viewMode === "monthly") return { fromDate: monthStart, toDate: monthEnd };
    if (hoursMode === "range")  return { fromDate: validFrom || undefined, toDate: validTo || undefined };
    return { weekStart: weekStartForHours ?? undefined };
  }, [viewMode, hoursMode, monthStart, monthEnd, weekStartForHours, validFrom, validTo]);

  const { data: dashData } = useSWR<ExecutiveDashboardData>(
    `executive-dashboard-${timeFilterKey}`, () => executiveApi.dashboard(timeFilterParams)
  );
  const { data: hoursLocData } = useSWR(
    `executive-hours-by-location-${timeFilterKey}`, () => executiveApi.hoursByLocation(timeFilterParams)
  );
  const { data: adherenceData } = useSWR<ShiftAdherenceData>(
    "executive-shift-adherence", () => executiveApi.shiftAdherence()
  );
  const { data: ptoData } = useSWR<PTOAnalyticsData>(
    "executive-pto-analytics", () => executiveApi.ptoAnalytics()
  );

  // ── Derived ──
  const pd = report?.parsed_data ?? null;
  const woshSummary = viewMode === "monthly" ? monthlyWoshSummary : pd?.summary ?? null;
  const woshDelta = woshSummary && (viewMode === "monthly" ? prevMonthlyWoshSummary : prevSummary)
    ? {
        violations: woshSummary.total_violations - (viewMode === "monthly" ? prevMonthlyWoshSummary!.total_violations : prevSummary!.total_violations),
        employees:  woshSummary.employees_affected - (viewMode === "monthly" ? prevMonthlyWoshSummary!.employees_affected : prevSummary!.employees_affected),
        early:      woshSummary.early_arrivals - (viewMode === "monthly" ? prevMonthlyWoshSummary!.early_arrivals : prevSummary!.early_arrivals),
        late:       woshSummary.late_departures - (viewMode === "monthly" ? prevMonthlyWoshSummary!.late_departures : prevSummary!.late_departures),
      }
    : null;

  const topManagersByExceptions = useMemo(() => {
    const rows = pd?.chart.by_manager ?? [];
    return [...rows].sort((a, b) => b.total - a.total);
  }, [pd]);

  const hourAllocationRows = useMemo((): HourAllocationRow[] => {
    if (!hoursLocData) return [];
    const rows: HourAllocationRow[] = [];
    for (const loc of hoursLocData.locations) {
      for (const dept of loc.departments) {
        rows.push({ location: loc.location, department: dept.department, regular: dept.regular_hours, ot: dept.ot_hours, total: dept.regular_hours + dept.ot_hours });
      }
    }
    return rows.sort((a, b) => b.total - a.total);
  }, [hoursLocData]);

  const avgAdherenceScore = useMemo(() => {
    if (!adherenceData?.managers.length) return null;
    return adherenceData.managers.reduce((s, m) => s + m.adherence_score, 0) / adherenceData.managers.length;
  }, [adherenceData]);

  // ── Delta display helpers ──
  function deltaStr(n: number | undefined, suffix = ""): string {
    if (n === undefined || n === 0) return "";
    return `${n > 0 ? "▲" : "▼"} ${Math.abs(n)}${suffix}`;
  }
  function deltaDir(n: number | undefined, higherIsBad = true): "up" | "down" | "flat" {
    if (!n) return "flat";
    if (higherIsBad) return n > 0 ? "up" : "down";
    return n > 0 ? "down" : "up";
  }

  // ── Navigation helpers ──
  function goOlderWeek() { if (currentIndex < weeks.length - 1) setSelectedId(weeks[currentIndex + 1].id); }
  function goNewerWeek() { if (currentIndex > 0) setSelectedId(weeks[currentIndex - 1].id); }

  function handleUploaded() { mutateHistory(); mutateReport(); }

  // ── Period label ──
  const periodLabel = viewMode === "monthly"
    ? currentMonthLabel
    : weeks[currentIndex]?.week_label ?? "No reports uploaded";

  if (user && !user.is_executive && !user.is_admin) {
    router.replace("/overview");
    return null;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">

      {/* ── Page header ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-bold leading-tight" style={{ color: "var(--heading-color)", letterSpacing: "-0.02em" }}>
            Executive Reports
          </h1>
          <p className="mt-0.5 text-[0.8rem]" style={{ color: "var(--module-context)" }}>
            {periodLabel}
            {viewMode === "monthly" && weeksInMonth.length > 0 && (
              <span> · {weeksInMonth.length} week{weeksInMonth.length !== 1 ? "s" : ""} of data</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* weekly / monthly toggle */}
          <div className="flex items-center rounded-[8px] p-0.5" style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)" }}>
            {(["weekly", "monthly"] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className="rounded-[6px] px-3.5 py-1.5 text-[0.75rem] font-semibold transition-all capitalize"
                style={{
                  background: viewMode === v
                    ? "linear-gradient(180deg,rgba(255,255,255,0.98) 0%,rgba(240,248,255,0.96) 100%)"
                    : "transparent",
                  color: viewMode === v ? "var(--heading-color)" : "var(--module-context)",
                  boxShadow: viewMode === v ? "inset 0 -2px 0 rgba(223,0,48,0.18), 0 1px 8px rgba(15,29,60,0.12)" : "none",
                  border: "none",
                }}
              >
                {v === "weekly" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>

          {/* period navigator */}
          <div className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5"
            style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)" }}>
            <button
              onClick={viewMode === "weekly" ? goOlderWeek : () => setMonthOffset(o => o + 1)}
              disabled={viewMode === "weekly" && currentIndex >= weeks.length - 1}
              className="text-[0.85rem] font-bold px-1 disabled:opacity-30 transition-opacity hover:opacity-60"
              style={{ color: "var(--module-context)", background: "none", border: "none", cursor: "pointer" }}
            >
              ‹
            </button>
            <span className="min-w-[160px] text-center text-[0.78rem] font-semibold" style={{ color: "var(--heading-color)" }}>
              {periodLabel}
            </span>
            <button
              onClick={viewMode === "weekly" ? goNewerWeek : () => setMonthOffset(o => Math.max(0, o - 1))}
              disabled={viewMode === "weekly" ? currentIndex <= 0 : monthOffset <= 0}
              className="text-[0.85rem] font-bold px-1 disabled:opacity-30 transition-opacity hover:opacity-60"
              style={{ color: "var(--module-context)", background: "none", border: "none", cursor: "pointer" }}
            >
              ›
            </button>
          </div>

          {/* live badge */}
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: "rgba(22,163,74,0.09)", border: "1px solid rgba(134,239,172,0.5)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 block" />
            <span className="text-[0.7rem] font-semibold text-green-700">Live</span>
          </div>
        </div>
      </div>

      {/* Upload bar — admins only */}
      {user?.is_admin && <UploadBar onUploaded={handleUploaded} />}

      {/* ── Tab navigation ── */}
      <TabNav active={activeTab} onChange={setActiveTab} woshCount={woshSummary?.total_violations} />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* WOSH KPI row */}
          <div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OverviewKpiCard
              label="Total Irregularities"
              value={fmtNum(woshSummary?.total_violations ?? 0)}
              delta={woshDelta ? deltaStr(woshDelta.violations, viewMode === "monthly" ? " vs prev month" : " vs prior week") : undefined}
              deltaDir={woshDelta ? deltaDir(woshDelta.violations) : undefined}
              accent="red"
            />
            <OverviewKpiCard
              label="Employees Affected"
              value={fmtNum(woshSummary?.employees_affected ?? 0)}
              delta={woshDelta ? deltaStr(woshDelta.employees) : undefined}
              deltaDir={woshDelta ? deltaDir(woshDelta.employees) : undefined}
              accent="amber"
            />
            <OverviewKpiCard
              label="Early Arrivals"
              value={fmtNum(woshSummary?.early_arrivals ?? 0)}
              delta={woshDelta ? deltaStr(woshDelta.early) : undefined}
              deltaDir={woshDelta ? deltaDir(woshDelta.early) : undefined}
              accent="blue"
            />
            <OverviewKpiCard
              label="Late Departures"
              value={fmtNum(woshSummary?.late_departures ?? 0)}
              delta={woshDelta ? deltaStr(woshDelta.late) : undefined}
              deltaDir={woshDelta ? deltaDir(woshDelta.late) : undefined}
              accent="amber"
            />
          </div>

          {/* Org KPI row */}
          <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OverviewKpiCard
              label="Total Employees"
              value={fmtNum(dashData?.headcount.total ?? 0)}
              sub={`${dashData?.headcount.managers ?? 0} managers · 3 locations`}
              accent="green"
              onClick={() => setActiveTab("hours")}
            />
            <OverviewKpiCard
              label="Regular Hours"
              value={fmtHrs(dashData?.totals.regular_hours ?? 0)}
              sub={viewMode === "monthly" ? currentMonthLabel : (dashData?.hours_date_range ?? "this period")}
              accent="blue"
              onClick={() => setActiveTab("hours")}
            />
            <OverviewKpiCard
              label="Overtime Hours"
              value={fmtHrs(dashData?.totals.ot_hours ?? 0)}
              sub={dashData && dashData.totals.regular_hours > 0
                ? `${((dashData.totals.ot_hours / (dashData.totals.regular_hours + dashData.totals.ot_hours)) * 100).toFixed(1)}% of total hours`
                : undefined}
              accent="amber"
              onClick={() => setActiveTab("hours")}
            />
          </div>

          {/* Trend + top managers */}
          <div className="mb-4 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <div className="rounded-[14px] px-5 pt-4 pb-3" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
                    {viewMode === "monthly" ? "Monthly Irregularities Trend" : "Irregularities Trend"}
                  </p>
                  <p className="mt-0.5 text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
                    {viewMode === "monthly" ? "Click a bar to navigate to that month" : `${weeks.length} week${weeks.length !== 1 ? "s" : ""} · click a bar to select`}
                  </p>
                </div>
                {woshDelta && woshDelta.violations !== 0 && (
                  <span className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold"
                    style={{
                      background: woshDelta.violations > 0 ? "rgba(223,0,48,0.10)" : "rgba(22,163,74,0.10)",
                      color: woshDelta.violations > 0 ? "var(--accent)" : "#16a34a",
                    }}>
                    {deltaStr(woshDelta.violations, viewMode === "monthly" ? " vs last month" : " vs prior week")}
                  </span>
                )}
              </div>
              {weeks.length >= 2 ? (
                viewMode === "monthly" ? (
                  <MonthlyTrendChart history={weeks} activeMonthKey={activeMonthKey} />
                ) : (
                  <WoshTrendChart history={weeks} activeId={effectiveReportId} onSelect={setSelectedId} />
                )
              ) : (
                <div className="flex h-[140px] items-center justify-center">
                  <p className="text-[0.8rem]" style={{ color: "var(--card-desc)" }}>Upload 2 or more WOSH reports to see trend.</p>
                </div>
              )}
            </div>

            <div className="rounded-[14px] px-5 pt-4 pb-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
                  Top Exceptions by Manager
                </p>
                <button onClick={() => setActiveTab("wosh")} className="text-[0.68rem] font-semibold hover:underline" style={{ color: "var(--brand-action,#0f7fb3)", background: "none", border: "none", cursor: "pointer" }}>
                  View all →
                </button>
              </div>
              {viewMode === "monthly" ? (
                <p className="text-[0.78rem] py-2" style={{ color: "var(--card-desc)" }}>Select Weekly view for per-manager breakdown.</p>
              ) : (
                <TopExceptionsByManager data={topManagersByExceptions} />
              )}
            </div>
          </div>

          {/* Hours by location/dept + manager compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <div className="rounded-[14px] px-5 pt-4 pb-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
                    Hours by Location &amp; Department
                  </p>
                  <p className="mt-0.5 text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
                    <span style={{ color: "#0f7fb3" }}>■</span> Regular &nbsp;
                    <span style={{ color: "#f59e0b" }}>■</span> Overtime
                  </p>
                </div>
                <button onClick={() => setActiveTab("hours")} className="text-[0.68rem] font-semibold hover:underline" style={{ color: "var(--brand-action,#0f7fb3)", background: "none", border: "none", cursor: "pointer" }}>
                  View all →
                </button>
              </div>
              <HoursByLocationDept locations={hoursLocData?.locations ?? []} />
            </div>

            <div className="rounded-[14px] px-5 pt-4 pb-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
                  Manager Compliance
                </p>
                <button onClick={() => setActiveTab("managers")} className="text-[0.68rem] font-semibold hover:underline" style={{ color: "var(--brand-action,#0f7fb3)", background: "none", border: "none", cursor: "pointer" }}>
                  View all →
                </button>
              </div>
              <ManagerComplianceCard managers={adherenceData?.managers.slice().sort((a, b) => b.adherence_score - a.adherence_score) ?? []} />
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SHIFT EXCEPTIONS TAB                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "wosh" && (
        <>
          {/* week selector (weekly mode only) */}
          {viewMode === "weekly" && weeks.length >= 1 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button onClick={goOlderWeek} disabled={currentIndex >= weeks.length - 1}
                className="rounded-[8px] px-2.5 py-1.5 text-[0.78rem] font-bold transition-all disabled:opacity-25 hover:opacity-70"
                style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}>←</button>
              <select
                value={selectedId ?? (weeks[0]?.id ?? "")}
                onChange={e => setSelectedId(e.target.value === "" ? null : Number(e.target.value))}
                className="rounded-[10px] px-3 py-1.5 text-[0.78rem]"
                style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none", minWidth: "200px" }}>
                {weeks.map(r => <option key={r.id} value={r.id}>{r.week_label ?? `Report #${r.id}`}</option>)}
              </select>
              <button onClick={goNewerWeek} disabled={currentIndex <= 0}
                className="rounded-[8px] px-2.5 py-1.5 text-[0.78rem] font-bold transition-all disabled:opacity-25 hover:opacity-70"
                style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", color: "var(--tab-text)" }}>→</button>
              {woshDelta !== null && <span className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>vs prior week</span>}
            </div>
          )}

          {viewMode === "monthly" && (
            <div className="mb-4 rounded-[10px] px-4 py-2.5 flex items-center gap-2 text-[0.78rem]"
              style={{ background: "rgba(15,127,179,0.07)", border: "1px solid rgba(15,127,179,0.2)", color: "#0d5f91" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Showing aggregated totals for {currentMonthLabel} across {weeksInMonth.length} week{weeksInMonth.length !== 1 ? "s" : ""}.
              {" "}Switch to Weekly to see per-manager breakdowns and exception details.
            </div>
          )}

          {/* Trend chart */}
          {weeks.length >= 2 && viewMode === "weekly" && (
            <div className="mb-5 rounded-[14px] px-5 pt-4 pb-2" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>Irregularities Trend</p>
              <WoshTrendChart history={weeks} activeId={effectiveReportId} onSelect={setSelectedId} />
            </div>
          )}
          {weeks.length >= 2 && viewMode === "monthly" && (
            <div className="mb-5 rounded-[14px] px-5 pt-4 pb-2" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}>
              <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>Monthly Trend</p>
              <MonthlyTrendChart history={weeks} activeMonthKey={activeMonthKey} />
            </div>
          )}

          {/* KPI cards */}
          {woshSummary ? (
            <>
              <SectionLabel>
                Shift Exceptions{viewMode === "weekly" && report?.week_label ? ` · ${report.week_label}` : viewMode === "monthly" ? ` · ${currentMonthLabel}` : ""}
              </SectionLabel>
              <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <OverviewKpiCard label="Total Irregularities" value={fmtNum(woshSummary.total_violations)}
                  delta={woshDelta ? deltaStr(woshDelta.violations) : undefined} deltaDir={woshDelta ? deltaDir(woshDelta.violations) : undefined} accent="red" />
                <OverviewKpiCard label="Employees Affected" value={fmtNum(woshSummary.employees_affected)}
                  delta={woshDelta ? deltaStr(woshDelta.employees) : undefined} deltaDir={woshDelta ? deltaDir(woshDelta.employees) : undefined} accent="amber" />
                <OverviewKpiCard label="Early Arrivals" value={fmtNum(woshSummary.early_arrivals)}
                  delta={woshDelta ? deltaStr(woshDelta.early) : undefined} deltaDir={woshDelta ? deltaDir(woshDelta.early) : undefined} accent="blue" />
                <OverviewKpiCard label="Late Departures" value={fmtNum(woshSummary.late_departures)}
                  delta={woshDelta ? deltaStr(woshDelta.late) : undefined} deltaDir={woshDelta ? deltaDir(woshDelta.late) : undefined} accent="amber" />
              </div>
            </>
          ) : (
            <div className="mb-4 rounded-[14px] py-8 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>No WOSH report uploaded yet</p>
              <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>Upload a Shift_Exception_Report.xlsx above to see exception data.</p>
            </div>
          )}

          {/* Per-manager table and exceptions (weekly only) */}
          {viewMode === "weekly" && pd?.chart.by_manager && pd.chart.by_manager.length > 0 && (
            <div className="mb-5">
              <ManagerSummaryTable data={pd.chart.by_manager} />
            </div>
          )}
          {viewMode === "weekly" && pd?.exceptions && pd.exceptions.length > 0 && (
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
          <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <OverviewKpiCard label="Total Employees" value={fmtNum(dashData?.headcount.total ?? 0)}
              sub={dashData ? `${dashData.headcount.managers} managers` : undefined} accent="green" />
            <OverviewKpiCard label="Regular Hours" value={fmtHrs(dashData?.totals.regular_hours ?? 0)}
              sub={dashData?.hours_date_range ?? undefined} accent="blue" />
            <OverviewKpiCard label="OT Hours" value={fmtHrs(dashData?.totals.ot_hours ?? 0)}
              sub={dashData && dashData.totals.regular_hours > 0
                ? `${((dashData.totals.ot_hours / (dashData.totals.regular_hours + dashData.totals.ot_hours)) * 100).toFixed(1)}% of total`
                : undefined}
              accent="amber" />
          </div>

          {/* Hours by location (detailed accordion view) */}
          <div className="mb-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: "var(--module-context)" }}>Hours by Location</p>
              {viewMode === "weekly" && (
                <div className="flex overflow-hidden rounded-[8px]" style={{ border: "1px solid var(--tab-group-border)" }}>
                  {(["week", "range"] as const).map(m => (
                    <button key={m} onClick={() => setHoursMode(m)}
                      className="px-2.5 py-1 text-[0.7rem] font-semibold transition-all"
                      style={{
                        background: hoursMode === m ? "linear-gradient(140deg,#17365d 0%,#0f7fb3 74%,#21b8e7 100%)" : "var(--tab-group-bg)",
                        color: hoursMode === m ? "#fff" : "var(--card-desc)",
                        border: "none",
                      }}>
                      {m === "week" ? "By Week" : "Date Range"}
                    </button>
                  ))}
                </div>
              )}
              {viewMode === "weekly" && hoursMode === "week" && report?.week_label && (
                <span className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>{report.week_label}</span>
              )}
              {viewMode === "monthly" && (
                <span className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>{currentMonthLabel}</span>
              )}
              {viewMode === "weekly" && hoursMode === "range" && (
                <>
                  <input type="date" value={hoursFrom} onChange={e => setHoursFrom(e.target.value)}
                    className="rounded-[8px] px-2 py-1 text-[0.75rem]"
                    style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }} />
                  <span className="text-[0.72rem] font-semibold" style={{ color: "var(--card-desc)" }}>–</span>
                  <input type="date" value={hoursTo} onChange={e => setHoursTo(e.target.value)}
                    className="rounded-[8px] px-2 py-1 text-[0.75rem]"
                    style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }} />
                </>
              )}
            </div>
            {hoursLocData && <HoursByLocation locations={hoursLocData.locations} />}
          </div>

          {/* Stacked horizontal chart */}
          <HourAllocationsChart
            rows={hourAllocationRows}
            subtitle={viewMode === "monthly" ? currentMonthLabel : report?.week_label ?? dashData?.hours_date_range ?? undefined}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TIME OFF TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pto" && (
        <>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <SectionLabel>Time Off by Location</SectionLabel>
            <span className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>All imported hours · cumulative</span>
          </div>
          <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <SpotlightCard title="Total PTO" value={fmtHrs(ptoData?.total_pto ?? 0)} detail="Vacation + Personal" accent="#0f7fb3" />
            <SpotlightCard title="Vacation" value={fmtHrs((ptoData?.locations ?? []).reduce((s, l) => s + l.vacation_hours, 0))} accent="#16a34a" />
            <SpotlightCard title="Personal" value={fmtHrs((ptoData?.locations ?? []).reduce((s, l) => s + l.personal_hours, 0))} accent="#d97706" />
            <SpotlightCard title="Protected" value={fmtHrs((ptoData?.locations ?? []).reduce((s, l) => s + l.protected_hours, 0))} detail="Jury, sick, FMLA, etc." accent="#6366f1" />
          </div>
          {ptoData && <PtoByLocation locations={ptoData.locations} />}
          <p className="mt-3 text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
            Totals reflect all hours imported to date and are not affected by the period selector above. Protected time (jury duty, sick, bereavement, FMLA) is shown separately and excluded from Total PTO.
          </p>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MANAGER COMPLIANCE TAB                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "managers" && (
        <>
          <SectionLabel>Manager Compliance</SectionLabel>
          <div className="mb-5 grid grid-cols-2 md:grid-cols-3 gap-3">
            <SpotlightCard title="Total Managers" value={fmtNum(adherenceData?.managers.length ?? 0)} accent="#0f7fb3" />
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
          {adherenceData && <ManagerAdherenceTable managers={adherenceData.managers} />}
          <p className="mt-3 text-[0.68rem]" style={{ color: "var(--card-desc)" }}>
            Score = (1 − OT rate) × (1 − absence rate) × (review compliance) × 100. Based on cumulative hours and review past-due status.
          </p>
        </>
      )}

    </div>
  );
}
