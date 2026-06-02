"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { managerApi, adminApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type {
  MonthDashboardData,
  DashboardCompareData,
  ManagerHoursSummary,
  ManagerHoursSummaryV2,
  ManagerTeamMemberV2,
  IndirectReport,
  AbsenceCategoryEntry,
  EmployeeDetailData,
  AttendanceThreshold,
} from "@/lib/types";
import { isDashboardCompare } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TRACK_LABELS: Record<string, string> = {
  hr: "HR",
  warehouse: "Warehouse",
  administrative: "Administrative",
  management: "Management",
};

const TRACK_COLORS: Record<string, { bg: string; text: string }> = {
  hr:             { bg: "rgba(59,130,246,0.1)",  text: "#1d4ed8" },
  warehouse:      { bg: "rgba(245,158,11,0.1)",  text: "#92400e" },
  administrative: { bg: "rgba(168,85,247,0.1)",  text: "#7e22ce" },
  management:     { bg: "rgba(22,163,74,0.1)",   text: "#15803d" },
};

const THRESHOLD_ORDER = ["termination", "final", "written", "verbal"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function daysUntilColor(days: number): string {
  if (days <= 7) return "#dc2626";
  if (days <= 14) return "#d97706";
  return "#16a34a";
}

function reviewTypeBadge(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("30")) return "30-Day";
  if (t.includes("60")) return "60-Day";
  if (t.includes("90")) return "90-Day";
  if (t.includes("annual")) return "Annual";
  if (t.includes("mid")) return "Mid-Year";
  return type;
}

function totalTimeOff(e: { vacation_hours: number; personal_hours: number }): number {
  return e.vacation_hours + e.personal_hours;
}

function thresholdColor(t: AttendanceThreshold): string {
  if (t === "termination") return "#dc2626";
  if (t === "final")       return "#d97706";
  if (t === "written")     return "#3b82f6";
  if (t === "verbal")      return "#16a34a";
  return "transparent";
}

function thresholdLabel(t: AttendanceThreshold): string {
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function buildMonthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
}

const _now = new Date();
const currentMonthStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}`;
const _prevDate = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
const prevMonthStr = `${_prevDate.getFullYear()}-${String(_prevDate.getMonth() + 1).padStart(2, "0")}`;
const MONTH_OPTIONS = buildMonthOptions();

const SELECT_STYLE = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(153,182,218,0.4)",
  color: "var(--sidebar-text)",
} as const;

// ── Shared card shell ─────────────────────────────────────────────────────────

function Card({ title, accent, children }: { title?: string; accent?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[16px] overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 8px rgba(12,24,47,0.06)",
      }}
    >
      {title && (
        <div
          className="px-5 py-3"
          style={{
            borderBottom: "1px solid rgba(153,182,218,0.22)",
            background: accent ? `${accent}08` : "rgba(255,255,255,0.5)",
          }}
        >
          <h2 className="text-[0.8rem] font-bold" style={{ color: accent ?? "var(--sidebar-text)" }}>{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, onClick }: { label: string; value: string | number; sub?: string; accent?: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={cn("group rounded-[14px] p-4 transition-all duration-150", onClick ? "hover:shadow-[0_4px_16px_rgba(12,24,47,0.12)]" : "")}
      style={{
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 8px rgba(12,24,47,0.06)",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.13em]" style={{ color: "var(--sidebar-label)" }}>
        {label}
      </p>
      <p className="text-[1.45rem] font-bold leading-none" style={{ color: accent ?? "var(--sidebar-text)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[0.66rem]" style={{ color: "var(--sidebar-label)" }}>{sub}</p>
      )}
      {onClick && (
        <div className="mt-1.5 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "var(--sidebar-label)" }} />
      )}
    </div>
  );
}

// ── SVG Donut chart ───────────────────────────────────────────────────────────

function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const R = 52, CX = 68, CY = 68, SW = 20;
  const C = 2 * Math.PI * R;
  const total = slices.reduce((s, d) => s + d.value, 0);
  let cumPct = 0;

  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(153,182,218,0.15)" strokeWidth={SW} />
      {total > 0 && slices.filter(d => d.value > 0).map((d) => {
        const pct = d.value / total;
        const dash = Math.max(0, pct * C - 2);
        const rotation = cumPct * 360 - 90;
        cumPct += pct;
        return (
          <circle
            key={d.label}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={d.color}
            strokeWidth={SW}
            strokeDasharray={`${dash} ${C}`}
            transform={`rotate(${rotation} ${CX} ${CY})`}
          />
        );
      })}
      {total > 0 ? (
        <>
          <text x={CX} y={CY - 5} textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--sidebar-text)">
            {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
          </text>
          <text x={CX} y={CY + 11} textAnchor="middle" fontSize="7.5" fill="var(--sidebar-label)">
            TOTAL HRS
          </text>
        </>
      ) : (
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize="9" fill="var(--sidebar-label)">No data</text>
      )}
    </svg>
  );
}

// ── PTO Breakdown card (vacation + personal only) ─────────────────────────────

const PTO_SLICES = [
  { key: "vacation_hours" as const, label: "Vacation", color: "#0ea5e9" },
  { key: "personal_hours" as const, label: "Personal", color: "#8b5cf6" },
];

function PtoBreakdownCard({ hours }: { hours: ManagerHoursSummary[] }) {
  const slices = PTO_SLICES.map(s => ({
    label: s.label,
    color: s.color,
    value: hours.reduce((sum, e) => sum + e[s.key], 0),
  }));
  const total = slices.reduce((s, d) => s + d.value, 0);

  return (
    <Card title="Time Off Breakdown">
      <div className="flex flex-col items-center gap-3 px-5 py-5">
        <DonutChart slices={slices} />
        {total > 0 ? (
          <div className="w-full space-y-2.5">
            {slices.filter(s => s.value > 0).sort((a, b) => b.value - a.value).map(s => (
              <div key={s.label} className="flex items-center gap-2.5">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[0.74rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{s.label}</span>
                    <span className="text-[0.74rem] font-bold tabular-nums" style={{ color: s.color }}>
                      {s.value.toFixed(1)}h
                    </span>
                  </div>
                  <div className="mt-0.5 h-[5px] w-full rounded-full overflow-hidden" style={{ background: "rgba(153,182,218,0.15)" }}>
                    <div className="h-full rounded-full" style={{ width: `${total > 0 ? Math.round((s.value / total) * 100) : 0}%`, background: s.color }} />
                  </div>
                </div>
                <span className="w-8 shrink-0 text-right text-[0.68rem] font-medium tabular-nums" style={{ color: "var(--sidebar-label)" }}>
                  {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No time off recorded for this period.</p>
        )}
      </div>
    </Card>
  );
}

// ── Leaderboard card ──────────────────────────────────────────────────────────

function LeaderboardCard({
  title, entries, accent, emptyMsg,
}: {
  title: string;
  entries: { name: string; id: string; value: number }[];
  accent: string;
  emptyMsg: string;
}) {
  const max = Math.max(1, entries[0]?.value ?? 0);
  return (
    <Card title={title}>
      <div className="px-4 py-4">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-[0.78rem]" style={{ color: "var(--sidebar-label)" }}>{emptyMsg}</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div
                key={e.id}
                className="relative overflow-hidden rounded-[10px] px-3 py-2.5"
                style={{ background: "rgba(153,182,218,0.05)", border: "1px solid rgba(153,182,218,0.12)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-[10px]"
                  style={{ width: `${Math.round((e.value / max) * 100)}%`, background: `${accent}12` }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-extrabold"
                      style={{ background: `${accent}20`, color: accent }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.8rem] font-semibold leading-tight" style={{ color: "var(--sidebar-text)" }}>{e.name}</p>
                      <p className="text-[0.62rem]" style={{ color: "var(--sidebar-label)" }}>{e.id}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[0.88rem] font-bold tabular-nums" style={{ color: accent }}>
                    {e.value.toFixed(1)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Staffing signals ──────────────────────────────────────────────────────────

type SignalTone = "neutral" | "info" | "warning" | "danger";

function Signal({ icon, text, tone }: { icon: string; text: string; tone: SignalTone }) {
  const styles: Record<SignalTone, { bg: string; border: string; color: string }> = {
    neutral: { bg: "rgba(153,182,218,0.10)", border: "rgba(153,182,218,0.25)", color: "var(--sidebar-label)" },
    info:    { bg: "rgba(14,165,233,0.08)",  border: "rgba(14,165,233,0.20)",  color: "#0369a1" },
    warning: { bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.22)",   color: "#92400e" },
    danger:  { bg: "rgba(220,38,38,0.08)",   border: "rgba(220,38,38,0.20)",   color: "#9f1239" },
  };
  const s = styles[tone];
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] px-3 py-2"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="shrink-0 text-[0.9rem]">{icon}</span>
      <span className="text-[0.73rem] font-medium leading-tight" style={{ color: s.color }}>{text}</span>
    </div>
  );
}

function StaffingSignals({
  hours, teamSize, upcomingReviews, pastDue,
}: {
  hours: ManagerHoursSummary[];
  teamSize: number;
  upcomingReviews: number;
  pastDue: number;
}) {
  if (hours.length === 0) return null;

  const signals: { icon: string; text: string; tone: SignalTone }[] = [];
  const totalReg = hours.reduce((s, e) => s + e.regular_hours, 0);
  const totalOt  = hours.reduce((s, e) => s + e.ot_hours, 0);
  const totalOff = hours.reduce((s, e) => s + totalTimeOff(e), 0);
  const withOt   = hours.filter(e => e.ot_hours > 0);
  const noHours  = hours.filter(e => e.regular_hours === 0);
  const avgReg   = totalReg / hours.length;

  if (totalReg > 0) {
    const otRate = (totalOt / totalReg) * 100;
    signals.push({
      icon: "⏱",
      text: `${otRate.toFixed(1)}% OT rate · ${avgReg.toFixed(0)}h avg/person`,
      tone: otRate > 15 ? "warning" : "neutral",
    });
  }
  if (withOt.length > 0) {
    const topOtWorker = [...hours].sort((a, b) => b.ot_hours - a.ot_hours)[0];
    const concentration = totalOt > 0 ? Math.round((topOtWorker.ot_hours / totalOt) * 100) : 0;
    signals.push({
      icon: "⚡",
      text: `${withOt.length} of ${hours.length} working OT${concentration >= 60 && withOt.length > 1 ? ` · ${concentration}% concentrated on 1 person` : ""}`,
      tone: concentration >= 60 && withOt.length > 1 ? "warning" : "neutral",
    });
  }
  if (totalOff > 0 && totalReg > 0) {
    signals.push({
      icon: "🌴",
      text: `${((totalOff / (totalReg + totalOff)) * 100).toFixed(1)}% of hours taken as time off this period`,
      tone: "neutral",
    });
  }
  if (noHours.length > 0) {
    signals.push({
      icon: "⚠",
      text: `${noHours.length} employee${noHours.length > 1 ? "s" : ""} with no regular hours — check upload`,
      tone: "warning",
    });
  }

  if (signals.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {signals.map((s, i) => <Signal key={i} {...s} />)}
    </div>
  );
}

// ── Planned vs. Unplanned Absence card ───────────────────────────────────────

const ABSENCE_ROWS = [
  { key: "planned",   label: "Planned",   color: "#0ea5e9", hKey: "planned_hours"   as const },
  { key: "unplanned", label: "Unplanned", color: "#dc2626", hKey: "unplanned_hours" as const },
  { key: "protected", label: "Protected", color: "#8b5cf6", hKey: "protected_hours" as const },
] as const;

function AbsenceDonut({ rows, grandTotal }: { rows: { label: string; value: number; color: string }[]; grandTotal: number }) {
  const R = 44, CX = 56, CY = 56, SW = 17;
  const C = 2 * Math.PI * R;
  let cumPct = 0;
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" className="shrink-0">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(153,182,218,0.15)" strokeWidth={SW} />
      {rows.filter(d => d.value > 0).map(d => {
        const pct = d.value / grandTotal;
        const dash = Math.max(0, pct * C - 1.5);
        const rotation = cumPct * 360 - 90;
        cumPct += pct;
        return (
          <circle key={d.label} cx={CX} cy={CY} r={R} fill="none" stroke={d.color}
            strokeWidth={SW} strokeDasharray={`${dash} ${C}`}
            transform={`rotate(${rotation} ${CX} ${CY})`} />
        );
      })}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--sidebar-text)">
        {grandTotal % 1 === 0 ? grandTotal : grandTotal.toFixed(0)}
      </text>
      <text x={CX} y={CY + 9} textAnchor="middle" fontSize="6.5" fill="var(--sidebar-label)">HOURS</text>
    </svg>
  );
}

function AbsenceCard({ data, dateRange }: { data: AbsenceCategoryEntry[]; dateRange: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const totals = ABSENCE_ROWS.map(r => ({ ...r, value: data.reduce((s, e) => s + e[r.hKey], 0) }));
  const grandTotal = totals.reduce((s, r) => s + r.value, 0);
  const activeRows = totals.filter(r => r.value > 0);
  const tableRows = [...data]
    .filter(e => e.planned_hours + e.unplanned_hours + e.protected_hours > 0)
    .sort((a, b) => (b.planned_hours + b.unplanned_hours + b.protected_hours) - (a.planned_hours + a.unplanned_hours + a.protected_hours));

  return (
    <Card title={`Planned vs. Unplanned Absences${dateRange ? ` — ${dateRange}` : ""}`}>
      {grandTotal === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>
            No absence data yet. Upload the Time Off Used report to see breakdown.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5 px-5 py-4">
            <AbsenceDonut rows={activeRows} grandTotal={grandTotal} />
            <div className="flex flex-col gap-2.5 flex-1">
              {activeRows.map(row => {
                const fmt = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(1);
                return (
                  <div key={row.key} className="flex items-center gap-2.5">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[0.74rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{row.label}</span>
                        <span className="text-[0.74rem] font-bold tabular-nums" style={{ color: row.color }}>{fmt(row.value)} hrs</span>
                      </div>
                      <div className="h-[5px] w-full rounded-full overflow-hidden" style={{ background: "rgba(153,182,218,0.15)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round((row.value / grandTotal) * 100)}%`, background: row.color }} />
                      </div>
                    </div>
                    <span className="w-8 shrink-0 text-right text-[0.68rem] font-medium tabular-nums" style={{ color: "var(--sidebar-label)" }}>
                      {Math.round((row.value / grandTotal) * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {tableRows.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex w-full items-center justify-between px-5 py-2 text-[0.74rem] font-semibold transition-colors hover:opacity-70"
                style={{ borderTop: "1px solid rgba(153,182,218,0.18)", color: "var(--sidebar-label)" }}
              >
                <span>{expanded ? "Hide" : "Show"} employee breakdown ({tableRows.length})</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
              {expanded && (
                <div className="overflow-x-auto" style={{ borderTop: "1px solid rgba(153,182,218,0.18)" }}>
                  <table className="w-full text-[0.76rem]">
                    <thead>
                      <tr style={{ background: "rgba(153,182,218,0.06)", borderBottom: "1px solid rgba(153,182,218,0.18)" }}>
                        <th className="px-4 py-2 text-left text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Employee</th>
                        {ABSENCE_ROWS.map(r => (
                          <th key={r.key} className="px-4 py-2 text-right text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: r.color }}>{r.label}</th>
                        ))}
                        <th className="px-4 py-2 text-right text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((emp, i, arr) => {
                        const empTotal = emp.planned_hours + emp.unplanned_hours + emp.protected_hours;
                        const fmt = (v: number) => v > 0 ? (v % 1 === 0 ? String(v) : v.toFixed(1)) : "—";
                        return (
                          <tr key={emp.employee_id} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(153,182,218,0.1)" : "none" }}>
                            <td className="px-4 py-1.5 font-semibold" style={{ color: "var(--sidebar-text)" }}>
                              {emp.full_name}
                              <span className="ml-2 text-[0.62rem] font-normal" style={{ color: "var(--sidebar-label)" }}>{emp.employee_id}</span>
                            </td>
                            <td className="px-4 py-1.5 text-right tabular-nums font-semibold" style={{ color: emp.planned_hours > 0 ? "#0ea5e9" : "var(--sidebar-label)" }}>{fmt(emp.planned_hours)}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums font-semibold" style={{ color: emp.unplanned_hours > 0 ? "#dc2626" : "var(--sidebar-label)" }}>{fmt(emp.unplanned_hours)}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums font-semibold" style={{ color: emp.protected_hours > 0 ? "#8b5cf6" : "var(--sidebar-label)" }}>{fmt(emp.protected_hours)}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums" style={{ color: "var(--sidebar-text)" }}>{empTotal % 1 === 0 ? empTotal : empTotal.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────

function EmployeeCard({ member, onClick }: { member: ManagerTeamMemberV2; onClick: () => void }) {
  const lastLogin = member.last_login_at
    ? formatDate(member.last_login_at)
    : member.first_login_at ? "Never logged in" : "Not yet enrolled";
  const tc = member.threshold ? thresholdColor(member.threshold) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="rounded-[14px] p-4 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
      style={{
        background: "rgba(255,255,255,0.82)",
        border: tc ? `1px solid ${tc}40` : "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 6px rgba(12,24,47,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.88rem] font-bold leading-tight" style={{ color: "var(--sidebar-text)" }}>{member.full_name}</p>
          <p className="mt-0.5 text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>{member.employee_id}</p>
        </div>
        {tc && member.threshold && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-bold"
            style={{ background: `${tc}18`, color: tc, border: `1px solid ${tc}30` }}>
            {thresholdLabel(member.threshold)}
          </span>
        )}
      </div>
      {member.department && (
        <p className="mt-2 text-[0.74rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{member.department}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {member.tracks.map((t) => {
          const color = TRACK_COLORS[t] ?? { bg: "rgba(100,116,139,0.1)", text: "#475569" };
          return (
            <span key={t} className="rounded-full px-2 py-0.5 text-[0.64rem] font-semibold" style={{ background: color.bg, color: color.text }}>
              {TRACK_LABELS[t] ?? t}
            </span>
          );
        })}
      </div>
      {(() => {
        const total = member.modules_total ?? 0;
        const done = Math.min(member.modules_completed, total || member.modules_completed);
        const pct = total > 0 ? Math.round((done / total) * 100) : null;
        return (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "rgba(153,182,218,0.2)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Modules</p>
              <p className="text-[0.72rem] font-medium tabular-nums" style={{ color: "var(--sidebar-text)" }}>
                {total > 0 ? `${done} / ${total}` : done}{pct !== null && ` · ${pct}%`}
              </p>
            </div>
            {total > 0 && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(153,182,218,0.25)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : "#0ea5e9" }} />
              </div>
            )}
          </div>
        );
      })()}
      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "rgba(153,182,218,0.2)" }}>
        <div>
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Last Login</p>
          <p className="mt-0.5 text-[0.72rem] font-medium" style={{ color: "var(--sidebar-text)" }}>{lastLogin}</p>
        </div>
        <div className="text-right">
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Points</p>
          <p className="mt-0.5 text-[0.72rem] font-medium tabular-nums" style={{ color: tc ?? "var(--sidebar-text)" }}>
            {member.point_total !== null ? member.point_total.toFixed(1) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Indirect Reports Section ──────────────────────────────────────────────────

function IndirectReportCard({ member }: { member: IndirectReport }) {
  const lastLogin = member.last_login_at
    ? formatDate(member.last_login_at)
    : member.first_login_at ? "Never logged in" : "Not yet enrolled";
  return (
    <div
      className="rounded-[12px] p-3"
      style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(153,182,218,0.22)" }}
    >
      <p className="text-[0.82rem] font-bold leading-tight" style={{ color: "var(--sidebar-text)" }}>{member.full_name}</p>
      <p className="mt-0.5 text-[0.65rem]" style={{ color: "var(--sidebar-label)" }}>{member.employee_id}</p>
      {member.department && (
        <p className="mt-1 text-[0.7rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{member.department}</p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {member.tracks.map((t) => {
          const color = TRACK_COLORS[t] ?? { bg: "rgba(100,116,139,0.1)", text: "#475569" };
          return (
            <span key={t} className="rounded-full px-2 py-0.5 text-[0.62rem] font-semibold" style={{ background: color.bg, color: color.text }}>
              {TRACK_LABELS[t] ?? t}
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-[0.65rem]" style={{ color: "var(--sidebar-label)" }}>
        Last login: <span style={{ color: "var(--sidebar-text)" }}>{lastLogin}</span>
      </p>
    </div>
  );
}

function IndirectReportsSection({ manager }: { manager: ManagerTeamMemberV2 }) {
  const [open, setOpen] = useState(true);
  const reports = manager.reports ?? [];
  if (reports.length === 0) return null;
  return (
    <div className="mt-3 rounded-[12px] overflow-hidden" style={{ background: "rgba(153,182,218,0.07)", border: "1px solid rgba(153,182,218,0.2)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-opacity hover:opacity-75"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className={cn("shrink-0 transition-transform duration-200", open && "rotate-90")}
          style={{ color: "var(--sidebar-label)" }}>
          <path d="M3 1.5L7 5L3 8.5" />
        </svg>
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>
          {manager.full_name}&rsquo;s Team
        </span>
        <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-semibold" style={{ background: "rgba(153,182,218,0.25)", color: "var(--sidebar-label)" }}>
          {reports.length}
        </span>
      </button>
      {open && (
        <div className="grid gap-2.5 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map(r => <IndirectReportCard key={r.employee_id} member={r} />)}
        </div>
      )}
    </div>
  );
}

// ── Team Roster View ──────────────────────────────────────────────────────────

function TeamRosterView({ team, onSelect }: { team: ManagerTeamMemberV2[]; onSelect: (m: ManagerTeamMemberV2) => void }) {
  if (team.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[0.85rem]" style={{ color: "var(--sidebar-label)" }}>
          No team members assigned yet. Ask an admin to assign employees to you.
        </p>
      </div>
    );
  }

  const groups = new Map<string, ManagerTeamMemberV2[]>();
  for (const member of team) {
    const key = member.department ?? "No Department";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(member);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === "No Department") return 1;
    if (b === "No Department") return -1;
    return a.localeCompare(b);
  });

  const managersWithReports = team.filter(m => m.is_manager && (m.reports?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      {sorted.map(([dept, members]) => (
        <div key={dept}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[0.82rem] font-bold" style={{ color: "var(--sidebar-text)" }}>{dept}</h2>
            <span className="rounded-full px-2 py-0.5 text-[0.64rem] font-semibold" style={{ background: "rgba(153,182,218,0.18)", color: "var(--sidebar-label)" }}>
              {members.length}
            </span>
            <div className="h-px flex-1" style={{ background: "rgba(153,182,218,0.25)" }} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => <EmployeeCard key={m.employee_id} member={m} onClick={() => onSelect(m)} />)}
          </div>
        </div>
      ))}
      {managersWithReports.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[0.82rem] font-bold" style={{ color: "var(--sidebar-text)" }}>Indirect Reports</h2>
            <span className="rounded-full px-2 py-0.5 text-[0.64rem] font-semibold" style={{ background: "rgba(153,182,218,0.18)", color: "var(--sidebar-label)" }}>
              {managersWithReports.reduce((s, m) => s + (m.reports?.length ?? 0), 0)}
            </span>
            <div className="h-px flex-1" style={{ background: "rgba(153,182,218,0.25)" }} />
          </div>
          <div className="space-y-3">
            {managersWithReports.map(m => <IndirectReportsSection key={m.employee_id} manager={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Threshold Alerts Card ─────────────────────────────────────────────────────

function ThresholdAlertsCard({ team, onClickEmployee }: {
  team: ManagerTeamMemberV2[];
  onClickEmployee: (employeeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const atThreshold = team.filter(m => m.threshold !== null);

  return (
    <div className="overflow-hidden rounded-[16px]" style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(153,182,218,0.28)", boxShadow: "0 2px 12px rgba(12,24,47,0.07)" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-5 py-4 transition-opacity hover:opacity-80"
      >
        <span className="text-[0.8rem] font-bold" style={{ color: "var(--sidebar-text)" }}>Attendance Threshold Alerts</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--sidebar-label)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      {expanded && (
        atThreshold.length === 0 ? (
          <div className="px-5 pb-6 text-center">
            <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>
              No employees are currently at a threshold level.
            </p>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid rgba(153,182,218,0.18)" }}>
            {THRESHOLD_ORDER.filter(level => atThreshold.some(m => m.threshold === level)).map(level => {
              const members = atThreshold.filter(m => m.threshold === level);
              const color = thresholdColor(level);
              return (
                <div key={level} className="px-5 py-3" style={{ borderBottom: "1px solid rgba(153,182,218,0.12)" }}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[0.66rem] font-bold capitalize"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                      {level}
                    </span>
                    <span className="text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
                      {members.length} employee{members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {members.map(m => (
                      <button
                        key={m.employee_id}
                        onClick={() => onClickEmployee(m.employee_id)}
                        className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left transition-all hover:opacity-75"
                        style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                      >
                        <span className="text-[0.8rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{m.full_name}</span>
                        <span className="text-[0.74rem] font-bold tabular-nums" style={{ color }}>
                          {m.point_total?.toFixed(1) ?? "—"} pts
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

// ── Employee Detail Panel ─────────────────────────────────────────────────────

function EmployeeDetailInner({ employeeId, month, onClose }: {
  employeeId: string;
  month: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useSWR<EmployeeDetailData>(
    ["emp-detail", employeeId, month],
    () => managerApi.employeeDetail(employeeId, month),
    { revalidateOnFocus: false }
  );

  const tc = data?.threshold ? thresholdColor(data.threshold) : null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.97)",
      borderLeft: "1px solid rgba(153,182,218,0.28)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(153,182,218,0.22)", background: "rgba(255,255,255,0.9)" }}>
        <div>
          {data ? (
            <>
              <p className="text-[1rem] font-bold" style={{ color: "var(--sidebar-text)" }}>{data.employee.full_name}</p>
              <p className="text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
                {data.employee.employee_id}{data.employee.department ? ` · ${data.employee.department}` : ""}
              </p>
            </>
          ) : (
            <p className="text-[0.85rem] font-semibold" style={{ color: "var(--sidebar-label)" }}>Loading…</p>
          )}
        </div>
        <button onClick={onClose}
          className="rounded-full p-1.5 transition-all hover:opacity-60"
          style={{ color: "var(--sidebar-label)", background: "rgba(153,182,218,0.12)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center py-16"><Spinner className="h-6 w-6" /></div>
        )}
        {error && (
          <p className="text-center text-[0.8rem] py-8" style={{ color: "#dc2626" }}>
            Could not load employee details.
          </p>
        )}
        {data && (
          <>
            {/* Threshold banner */}
            {data.threshold && tc && (
              <div className="rounded-[12px] px-4 py-3 flex items-center gap-3"
                style={{ background: `${tc}10`, border: `1px solid ${tc}30` }}>
                <span className="text-[0.7rem] font-bold uppercase tracking-wide" style={{ color: tc }}>
                  {thresholdLabel(data.threshold)} Warning
                </span>
                <span className="text-[0.88rem] font-bold tabular-nums ml-auto" style={{ color: tc }}>
                  {data.current_point_total?.toFixed(1) ?? "—"} pts total
                </span>
              </div>
            )}

            {/* Hours */}
            <div>
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>
                Hours — {formatMonth(month)}
              </p>
              <div className="rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(153,182,218,0.2)" }}>
                {([
                  { label: "Regular",         value: data.hours.regular,         color: "var(--sidebar-text)" },
                  { label: "Overtime",         value: data.hours.ot,              color: data.hours.ot > 0 ? "#d97706" : "var(--sidebar-label)" },
                  { label: "Vacation",         value: data.hours.vacation,        color: data.hours.vacation > 0 ? "#0ea5e9" : "var(--sidebar-label)" },
                  { label: "Personal",         value: data.hours.personal,        color: data.hours.personal > 0 ? "#8b5cf6" : "var(--sidebar-label)" },
                  { label: "Absent w/ Point",  value: data.hours.absent_w_point,  color: data.hours.absent_w_point > 0 ? "#dc2626" : "var(--sidebar-label)" },
                  { label: "Protected",        value: data.hours.protected,       color: data.hours.protected > 0 ? "#16a34a" : "var(--sidebar-label)" },
                  { label: "Other",            value: data.hours.other,           color: data.hours.other > 0 ? "#f59e0b" : "var(--sidebar-label)" },
                ]).map((row, i, arr) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(153,182,218,0.1)" : "none" }}>
                    <span className="text-[0.78rem]" style={{ color: "var(--sidebar-label)" }}>{row.label}</span>
                    <span className="text-[0.82rem] font-semibold tabular-nums" style={{ color: row.color }}>{row.value.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            {(data.reviews.past_due.length > 0 || data.reviews.upcoming.length > 0) && (
              <div>
                <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>
                  Performance Reviews
                </p>
                <div className="space-y-1.5">
                  {data.reviews.past_due.map((r, i) => (
                    <div key={i} className="rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-2"
                      style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
                      <div>
                        <p className="text-[0.78rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{reviewTypeBadge(r.review_type)}</p>
                        <p className="text-[0.66rem]" style={{ color: "var(--sidebar-label)" }}>Was due {formatDate(r.due_date)}</p>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.66rem] font-bold"
                        style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626" }}>
                        {r.days_overdue}d overdue
                      </span>
                    </div>
                  ))}
                  {data.reviews.upcoming.map((r, i) => (
                    <div key={i} className="rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-2"
                      style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}>
                      <div>
                        <p className="text-[0.78rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{reviewTypeBadge(r.review_type)}</p>
                        <p className="text-[0.66rem]" style={{ color: "var(--sidebar-label)" }}>Due {formatDate(r.due_date)}</p>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.66rem] font-bold"
                        style={{ background: `${daysUntilColor(r.days_until)}18`, color: daysUntilColor(r.days_until) }}>
                        {r.days_until === 0 ? "Today" : `${r.days_until}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance Points */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>
                  Points — {formatMonth(month)}
                </p>
                {data.current_point_total !== null && !data.threshold && (
                  <span className="text-[0.72rem] font-semibold tabular-nums" style={{ color: "var(--sidebar-label)" }}>
                    Total: {data.current_point_total.toFixed(1)}
                  </span>
                )}
              </div>
              {data.attendance_points.length === 0 ? (
                <p className="text-[0.78rem]" style={{ color: "var(--sidebar-label)" }}>No point events this month.</p>
              ) : (
                <div className="rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(153,182,218,0.2)" }}>
                  <table className="w-full text-[0.76rem]">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(153,182,218,0.18)", background: "rgba(153,182,218,0.06)" }}>
                        {["Date", "Reason", "Pts", "Total", "Mon"].map(h => (
                          <th key={h}
                            className={cn("px-3 py-2 text-[0.6rem] font-bold uppercase tracking-[0.1em]",
                              h === "Pts" || h === "Total" ? "text-right" : h === "Mon" ? "text-center" : "text-left")}
                            style={{ color: "var(--sidebar-label)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendance_points.map((p, i) => (
                        <tr key={i} style={{ borderBottom: i < data.attendance_points.length - 1 ? "1px solid rgba(153,182,218,0.1)" : "none" }}>
                          <td className="px-3 py-2 tabular-nums whitespace-nowrap" style={{ color: "var(--sidebar-text)" }}>{formatDate(p.point_date)}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "var(--sidebar-label)" }}>{p.reason ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: p.point > 0 ? "#dc2626" : "var(--sidebar-label)" }}>{p.point}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold" style={{ color: "var(--sidebar-text)" }}>{p.point_total.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center text-[0.7rem] font-bold" style={{ color: p.flag_code ? "#d97706" : "var(--sidebar-label)" }}>
                            {p.flag_code ? "✓" : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmployeeDetailPanel({ employee, month, onClose }: {
  employee: ManagerTeamMemberV2;
  month: string;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(12,24,47,0.25)" }}
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 h-full w-[420px] shadow-2xl" style={{ maxWidth: "100vw" }}>
        <EmployeeDetailInner
          key={employee.employee_id}
          employeeId={employee.employee_id}
          month={month}
          onClose={onClose}
        />
      </div>
    </>
  );
}

// ── Absence Category Table ────────────────────────────────────────────────────

function AbsenceCategoryTable({ data, filter }: { data: AbsenceCategoryEntry[]; filter: string[] }) {
  const rows = filter.length > 0 ? data.filter(r => filter.includes(r.employee_id)) : data;

  return (
    <Card title="Time Off by Category">
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No absence category data for this period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[0.78rem]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(153,182,218,0.2)" }}>
                {["Employee", "Vacation", "Personal", "Abs w/Pt", "Protected", "Other", "Total"].map(h => (
                  <th key={h}
                    className={cn("px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.1em]", h !== "Employee" ? "text-right" : "text-left")}
                    style={{ color: "var(--sidebar-label)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => {
                  const ta = a.vacation_hours + a.personal_hours + a.absent_w_point_hours + a.protected_hours + a.other_hours;
                  const tb = b.vacation_hours + b.personal_hours + b.absent_w_point_hours + b.protected_hours + b.other_hours;
                  return tb - ta;
                })
                .map((emp, i, arr) => {
                  const total = emp.vacation_hours + emp.personal_hours + emp.absent_w_point_hours + emp.protected_hours + emp.other_hours;
                  return (
                    <tr key={emp.employee_id} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(153,182,218,0.12)" : "none" }}>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--sidebar-text)" }}>
                        {emp.full_name}
                        {emp.has_monday_flag && (
                          <span className="ml-1.5 text-[0.6rem] font-bold rounded-full px-1.5 py-0.5"
                            style={{ background: "rgba(217,119,6,0.12)", color: "#d97706" }}>MON</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: emp.vacation_hours > 0 ? "#0ea5e9" : "var(--sidebar-label)" }}>{emp.vacation_hours.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: emp.personal_hours > 0 ? "#8b5cf6" : "var(--sidebar-label)" }}>{emp.personal_hours.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: emp.absent_w_point_hours > 0 ? "#dc2626" : "var(--sidebar-label)" }}>{emp.absent_w_point_hours.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: emp.protected_hours > 0 ? "#16a34a" : "var(--sidebar-label)" }}>{emp.protected_hours.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: emp.other_hours > 0 ? "#f59e0b" : "var(--sidebar-label)" }}>{emp.other_hours.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold" style={{ color: "var(--sidebar-text)" }}>{total.toFixed(1)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Attendance Points Table ───────────────────────────────────────────────────

function AttendancePointsTable({ team, absenceByCategory, filter, onSelectEmployee }: {
  team: ManagerTeamMemberV2[];
  absenceByCategory: AbsenceCategoryEntry[];
  filter: string[];
  onSelectEmployee: (m: ManagerTeamMemberV2) => void;
}) {
  const mondayIds = new Set(absenceByCategory.filter(a => a.has_monday_flag).map(a => a.employee_id));
  const source = filter.length > 0 ? team.filter(m => filter.includes(m.employee_id)) : team;
  const rows = [...source]
    .filter(m => m.point_total !== null || mondayIds.has(m.employee_id))
    .sort((a, b) => (b.point_total ?? 0) - (a.point_total ?? 0));

  return (
    <Card title="Attendance Points">
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No attendance point data available.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[0.78rem]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(153,182,218,0.2)" }}>
                {["Employee", "Current Total", "Threshold", "Mon Flag"].map(h => (
                  <th key={h}
                    className={cn("px-4 py-3 text-[0.62rem] font-bold uppercase tracking-[0.1em]", h !== "Employee" ? "text-center" : "text-left")}
                    style={{ color: "var(--sidebar-label)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const tc = m.threshold ? thresholdColor(m.threshold) : null;
                return (
                  <tr
                    key={m.employee_id}
                    onClick={() => onSelectEmployee(m)}
                    className="cursor-pointer transition-colors hover:bg-blue-50/30"
                    style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(153,182,218,0.12)" : "none" }}
                  >
                    <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--sidebar-text)" }}>
                      {m.full_name}
                      <span className="ml-2 text-[0.62rem] font-normal" style={{ color: "var(--sidebar-label)" }}>{m.employee_id}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums font-bold" style={{ color: tc ?? "var(--sidebar-text)" }}>
                      {m.point_total?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {m.threshold ? (
                        <span className="rounded-full px-2 py-0.5 text-[0.64rem] font-bold capitalize"
                          style={{ background: `${tc}18`, color: tc!, border: `1px solid ${tc}30` }}>
                          {m.threshold}
                        </span>
                      ) : (
                        <span style={{ color: "var(--sidebar-label)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {mondayIds.has(m.employee_id) ? (
                        <span className="text-[0.72rem] font-bold" style={{ color: "#d97706" }}>✓</span>
                      ) : (
                        <span style={{ color: "var(--sidebar-label)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Dept Tile ────────────────────────────────────────────────────────────────

function DeptTile({
  icon, label, value, sub, accent, badge, note,
}: {
  icon: string; label: string; value: string | number;
  sub?: string; accent?: string;
  badge?: { text: string; color: string };
  note?: string;
}) {
  return (
    <div
      className="rounded-[14px] p-4"
      style={{
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 8px rgba(12,24,47,0.06)",
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[1.25rem] leading-none">{icon}</span>
        {badge && (
          <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
            style={{ background: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}30` }}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--sidebar-label)" }}>{label}</p>
      <p className="text-[1.35rem] font-bold leading-none" style={{ color: accent ?? "var(--sidebar-text)" }}>{value}</p>
      {sub && <p className="mt-1 text-[0.66rem]" style={{ color: "var(--sidebar-label)" }}>{sub}</p>}
      {note && <p className="mt-2 text-[0.63rem] italic leading-tight" style={{ color: "var(--sidebar-label)", opacity: 0.65 }}>{note}</p>}
    </div>
  );
}

// ── Resource Link Item ────────────────────────────────────────────────────────

function ResourceLinkItem({ icon, label, desc, href }: { icon: string; label: string; desc?: string; href?: string }) {
  const inner = (
    <>
      <span className="shrink-0 text-[1.1rem]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{label}</p>
        {desc && <p className="mt-0.5 text-[0.68rem] leading-tight" style={{ color: "var(--sidebar-label)" }}>{desc}</p>}
      </div>
      <svg className="shrink-0" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sidebar-label)" }}>
        <path d="M2 6h8M6 2l4 4-4 4" />
      </svg>
    </>
  );
  const cls = "flex items-center gap-3 rounded-[12px] p-3 transition-all hover:opacity-80";
  const sty = { background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.18)", textDecoration: "none" as const };
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={sty}>{inner}</a>;
  }
  return <div className={cls} style={{ ...sty, cursor: "default" as const }}>{inner}</div>;
}

// ── Planning Checklist Item ───────────────────────────────────────────────────

function PlanningCheckItem({ id, text, checked, onChange }: { id: string; text: string; checked: boolean; onChange: (id: string, val: boolean) => void }) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-[12px] p-3.5 transition-all"
      style={{
        background: checked ? "rgba(22,163,74,0.06)" : "rgba(153,182,218,0.06)",
        border: `1px solid ${checked ? "rgba(22,163,74,0.25)" : "rgba(153,182,218,0.2)"}`,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(id, e.target.checked)}
        className="mt-0.5 shrink-0"
        style={{ accentColor: "#16a34a", width: "15px", height: "15px" }}
      />
      <span
        className="text-[0.8rem] leading-snug"
        style={{
          color: checked ? "var(--sidebar-label)" : "var(--sidebar-text)",
          textDecoration: checked ? "line-through" : "none",
          opacity: checked ? 0.65 : 1,
        }}
      >
        {text}
      </span>
    </label>
  );
}

// ── Department Dashboard Section ──────────────────────────────────────────────

function DepartmentDashboardSection({
  teamSize, upcomingReviews, pastDue, onboardingTeam,
}: {
  teamSize: number;
  upcomingReviews: number;
  pastDue: number;
  onboardingTeam: ManagerTeamMemberV2[];
}) {
  const totalModules   = onboardingTeam.reduce((s, m) => s + (m.modules_total ?? 0), 0);
  const completedMods  = onboardingTeam.reduce((s, m) => s + m.modules_completed, 0);
  const onboardingPct  = totalModules > 0 ? Math.round((completedMods / totalModules) * 100) : null;
  const fullyOnboarded = onboardingTeam.filter(m => m.modules_total && m.modules_completed >= m.modules_total).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DeptTile
          icon="👥" label="Team Size" value={teamSize}
          sub="Active employees" accent="var(--sidebar-text)"
        />
        <DeptTile
          icon="📋" label="New Hire Onboarding"
          value={onboardingPct !== null ? `${onboardingPct}%` : "—"}
          sub={`${fullyOnboarded} of ${onboardingTeam.length} fully complete`}
          accent={onboardingPct === 100 ? "#16a34a" : onboardingPct !== null && onboardingPct > 50 ? "#0ea5e9" : "var(--sidebar-text)"}
        />
        <DeptTile
          icon="📅" label="Upcoming Reviews"
          value={upcomingReviews}
          sub="Due within 30 days"
          accent={upcomingReviews > 0 ? "#0f6da3" : "var(--sidebar-text)"}
          badge={pastDue > 0 ? { text: `${pastDue} overdue`, color: "#dc2626" } : undefined}
        />
        <DeptTile
          icon="🎯" label="Open Positions" value="—"
          sub="Connect to BambooHR"
          note="Link to recruiting data coming soon"
        />
        <DeptTile
          icon="📚" label="Training Completion"
          value={onboardingPct !== null ? `${onboardingPct}%` : "—"}
          sub="Module completion rate"
          accent={onboardingPct !== null && onboardingPct >= 80 ? "#16a34a" : onboardingPct !== null ? "#d97706" : "var(--sidebar-text)"}
        />
        <DeptTile
          icon="⚡" label="Pending Manager Tasks"
          value={pastDue + upcomingReviews}
          sub="Reviews due or overdue"
          accent={(pastDue + upcomingReviews) > 0 ? "#d97706" : "#16a34a"}
        />
        <DeptTile
          icon="📈" label="Turnover / Changes" value="—"
          sub="Connect to HRIS"
          note="Import staffing change data to enable"
        />
        <DeptTile
          icon="🏆" label="Performance Reviews"
          value={upcomingReviews + pastDue}
          sub={`${pastDue} overdue · ${upcomingReviews} upcoming`}
          accent={pastDue > 0 ? "#dc2626" : "var(--sidebar-text)"}
        />
      </div>

      <Card title="Related Reports & Guides">
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          <ResourceLinkItem icon="📊" label="BambooHR People Analytics" desc="Headcount, turnover, and org chart" href="https://app.bamboohr.com" />
          <ResourceLinkItem icon="📝" label="Performance Review Guide" desc="Manager guide to conducting reviews" />
          <ResourceLinkItem icon="🎓" label="LinkedIn Learning" desc="Training resources for your team" href="https://www.linkedin.com/learning/" />
          <ResourceLinkItem icon="📋" label="Onboarding Checklist" desc="New hire completion status guide" />
          <ResourceLinkItem icon="👋" label="New Hire 30/60/90 Plan" desc="Template for onboarding milestone planning" />
          <ResourceLinkItem icon="📞" label="HR Contact" desc="Reach your HR Business Partner" />
        </div>
      </Card>
    </div>
  );
}

// ── Review Calendar Section ───────────────────────────────────────────────────

type ReviewCalendarRow = {
  employee: string;
  employeeId: string;
  reviewType: string;
  dueDate: string;
  reminderDate: string;
  manager: string;
  status: "upcoming" | "reminder-sent" | "overdue";
  daysUntil?: number;
  daysOverdue?: number;
};

const REVIEW_STATUS_STYLES: Record<ReviewCalendarRow["status"], { bg: string; color: string; label: string }> = {
  "upcoming":      { bg: "rgba(14,165,233,0.1)",  color: "#0369a1",  label: "Upcoming" },
  "reminder-sent": { bg: "rgba(217,119,6,0.1)",   color: "#92400e",  label: "Reminder Sent" },
  "overdue":       { bg: "rgba(220,38,38,0.1)",   color: "#dc2626",  label: "Overdue" },
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ReviewCalendarSection({
  upcoming, pastDue, managerName,
}: {
  upcoming: { full_name: string; employee_id: string; review_type: string; due_date: string; days_until: number }[];
  pastDue: { full_name: string; employee_id: string; review_type: string; due_date: string; days_overdue: number }[];
  managerName: string;
}) {
  const rows: ReviewCalendarRow[] = [
    ...pastDue.map(r => ({
      employee: r.full_name, employeeId: r.employee_id,
      reviewType: reviewTypeBadge(r.review_type),
      dueDate: r.due_date, reminderDate: addDays(r.due_date, -7),
      manager: managerName,
      status: "overdue" as const,
      daysOverdue: r.days_overdue,
    })),
    ...upcoming.map(r => ({
      employee: r.full_name, employeeId: r.employee_id,
      reviewType: reviewTypeBadge(r.review_type),
      dueDate: r.due_date, reminderDate: addDays(r.due_date, -7),
      manager: managerName,
      status: (r.days_until <= 7 ? "reminder-sent" : "upcoming") as ReviewCalendarRow["status"],
      daysUntil: r.days_until,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[12px] px-4 py-3"
        style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}>
        <span className="mt-0.5 shrink-0 text-[1.1rem]">📅</span>
        <div>
          <p className="text-[0.8rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>
            Outlook Calendar Reminders
          </p>
          <p className="mt-0.5 text-[0.74rem] leading-relaxed" style={{ color: "var(--sidebar-label)" }}>
            Supervisors receive automatic Outlook calendar reminders <strong>one week before</strong> each performance review due date to support timely completion. Reviews marked <em>Reminder Sent</em> have a reminder due within 7 days.
          </p>
        </div>
      </div>

      <Card title={`Review Schedule (${rows.length} total)`}>
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[0.85rem]" style={{ color: "var(--sidebar-label)" }}>
              No upcoming or overdue reviews for your team.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8rem]">
              <thead>
                <tr style={{ background: "rgba(153,182,218,0.06)", borderBottom: "1px solid rgba(153,182,218,0.2)" }}>
                  {["Employee", "Review Type", "Due Date", "Reminder Date", "Manager", "Status"].map(h => (
                    <th key={h}
                      className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--sidebar-label)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const s = REVIEW_STATUS_STYLES[row.status];
                  return (
                    <tr key={`${row.employeeId}-${i}`}
                      style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(153,182,218,0.1)" : "none" }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold" style={{ color: "var(--sidebar-text)" }}>{row.employee}</p>
                        <p className="text-[0.65rem]" style={{ color: "var(--sidebar-label)" }}>{row.employeeId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold"
                          style={{ background: "rgba(153,182,218,0.15)", color: "var(--sidebar-text)" }}>
                          {row.reviewType}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "var(--sidebar-text)" }}>
                        {formatDate(row.dueDate)}
                        {row.daysOverdue !== undefined && (
                          <span className="ml-2 text-[0.65rem] font-semibold" style={{ color: "#dc2626" }}>
                            {row.daysOverdue}d overdue
                          </span>
                        )}
                        {row.daysUntil !== undefined && (
                          <span className="ml-2 text-[0.65rem]" style={{ color: daysUntilColor(row.daysUntil) }}>
                            {row.daysUntil === 0 ? "Today" : `in ${row.daysUntil}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[0.78rem]" style={{ color: "var(--sidebar-label)" }}>
                        {formatDate(row.reminderDate)}
                      </td>
                      <td className="px-4 py-3 text-[0.78rem]" style={{ color: "var(--sidebar-text)" }}>
                        {row.manager}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
                          style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Workforce Planning Section ────────────────────────────────────────────────

const PLANNING_CHECKLIST_ITEMS = [
  { id: "coverage",      text: "Do we have enough coverage for upcoming workload or schedule changes?" },
  { id: "transitions",   text: "Are any employees approaching retirement, transfer, promotion, or leave?" },
  { id: "crosstraining", text: "Are key duties documented and cross-trained with a backup employee?" },
  { id: "backup",        text: "Do we have backup coverage for all critical roles?" },
  { id: "skills",        text: "Are there skills or training gaps on our team we need to address?" },
  { id: "jobdesc",       text: "Are any role descriptions outdated and in need of review or updates?" },
  { id: "new-hire-plan", text: "Is there a 30/60/90 day plan in place for any current new hires?" },
  { id: "succession",    text: "Have we identified key role coverage and succession planning needs?" },
  { id: "growth",        text: "Are there any anticipated department growth or restructuring changes?" },
];

const WORKFORCE_TOOLS = [
  { icon: "📋", label: "Staffing Request / Position Planning",  desc: "Submit or track open position requests" },
  { icon: "👥", label: "Department Headcount Overview",         desc: "View current FTE count and allocation" },
  { icon: "🔄", label: "Cross-Training Tracker",               desc: "Document backup employees for critical duties" },
  { icon: "📈", label: "Skills Gap Tracking",                  desc: "Identify and log skill development needs" },
  { icon: "🗓", label: "Upcoming Vacancies & Changes",         desc: "Known staffing transitions in your department" },
  { icon: "🧩", label: "Succession Planning",                  desc: "Identify key role backups and high-potential employees" },
  { icon: "🌱", label: "30/60/90 New Hire Planning",           desc: "Milestone tracking for new team members" },
  { icon: "📐", label: "Department Growth & Restructuring",    desc: "Document planned team structure changes" },
];

function WorkforcePlanningSection({
  checks, onToggle,
}: {
  checks: Record<string, boolean>;
  onToggle: (id: string, val: boolean) => void;
}) {
  const checkedCount = PLANNING_CHECKLIST_ITEMS.filter(i => checks[i.id]).length;
  const total = PLANNING_CHECKLIST_ITEMS.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[14px] px-5 py-4"
        style={{ background: "rgba(15,109,163,0.06)", border: "1px solid rgba(15,109,163,0.2)" }}>
        <span className="mt-0.5 shrink-0 text-[1.4rem]">🗺</span>
        <div>
          <p className="text-[0.9rem] font-bold" style={{ color: "var(--sidebar-text)" }}>Workforce Planning Tools</p>
          <p className="mt-1 text-[0.78rem] leading-relaxed" style={{ color: "var(--sidebar-label)" }}>
            Use the tools and checklist below to proactively plan for staffing, coverage, and talent needs in your department. These tools are designed to help managers think ahead — not just react.
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--sidebar-label)" }}>Planning Tools</span>
          <div className="h-px flex-1" style={{ background: "rgba(153,182,218,0.25)" }} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {WORKFORCE_TOOLS.map(t => (
            <ResourceLinkItem key={t.label} icon={t.icon} label={t.label} desc={t.desc} />
          ))}
        </div>
      </div>

      {/* Quarterly planning checklist */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--sidebar-label)" }}>Quarterly Planning Checklist</span>
          </div>
          <span className="tabular-nums text-[0.72rem] font-semibold" style={{ color: checkedCount === total ? "#16a34a" : "var(--sidebar-label)" }}>
            {checkedCount} / {total} reviewed
          </span>
        </div>

        {checkedCount > 0 && (
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(153,182,218,0.2)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((checkedCount / total) * 100)}%`, background: checkedCount === total ? "#16a34a" : "#0f6da3" }} />
          </div>
        )}

        <div className="space-y-2">
          {PLANNING_CHECKLIST_ITEMS.map(item => (
            <PlanningCheckItem
              key={item.id} id={item.id} text={item.text}
              checked={!!checks[item.id]} onChange={onToggle}
            />
          ))}
        </div>

        {checkedCount === total && total > 0 && (
          <div className="mt-4 rounded-[12px] px-4 py-3 text-center"
            style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <p className="text-[0.8rem] font-bold" style={{ color: "#15803d" }}>
              Planning review complete! Great work thinking ahead for your team.
            </p>
          </div>
        )}
      </div>

      {/* Future integrations note */}
      <div className="rounded-[12px] px-4 py-3"
        style={{ background: "rgba(153,182,218,0.07)", border: "1px solid rgba(153,182,218,0.2)" }}>
        <p className="mb-1 text-[0.72rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>Coming Soon</p>
        <p className="text-[0.7rem] leading-relaxed" style={{ color: "var(--sidebar-label)" }}>
          Workforce planning tools will connect to BambooHR, Google Sheets, and internal HR forms to pull live headcount, vacancy, and skills data. Staffing request submissions will be integrated with the HR ticketing system.
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const canAccess = user?.is_manager || user?.is_admin || user?.is_executive;
  const canViewAs  = user?.is_admin || user?.is_executive;

  const [activeTab, setActiveTab] = useState<"metrics" | "roster" | "analytics" | "resources" | "planning">("metrics");
  const [planningChecks, setPlanningChecks] = useState<Record<string, boolean>>({});
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonth, setCompareMonth] = useState(prevMonthStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<ManagerTeamMemberV2 | null>(null);
  const [thresholdFilter, setThresholdFilter] = useState<string[]>([]);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [asManagerId, setAsManagerId] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !canAccess) router.replace("/overview");
  }, [authLoading, canAccess, router]);

  const { data: managersList } = useSWR(
    canViewAs ? "managers-list" : null,
    () => adminApi.managersList(),
    { revalidateOnFocus: false }
  );

  const { data: rawData, error, isLoading } = useSWR(
    canAccess ? ["mgr-dash", selectedMonth, compareMode ? compareMonth : null, asManagerId] : null,
    () => managerApi.monthDashboard(selectedMonth, compareMode ? compareMonth : undefined, asManagerId || undefined),
    { revalidateOnFocus: false }
  );

  if (authLoading || (!rawData && isLoading)) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  if (!canAccess) return null;

  if (error) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-[0.85rem] font-medium" style={{ color: "#dc2626" }}>
          Could not load dashboard. Make sure the backend is running.
        </p>
      </div>
    );
  }

  const isCompare = rawData ? isDashboardCompare(rawData) : false;
  const dashboard = rawData
    ? (isCompare ? (rawData as DashboardCompareData).month : (rawData as MonthDashboardData))
    : undefined;
  const compareDashboard = isCompare ? (rawData as DashboardCompareData).compare_month : undefined;

  // ── Filters ──
  const departments = [...new Set(
    (dashboard?.team ?? []).map(m => m.department ?? "No Department")
  )].sort((a, b) => a === "No Department" ? 1 : b === "No Department" ? -1 : a.localeCompare(b));

  const isFiltered = searchQuery.trim() !== "" || deptFilter !== "all";
  const matchesMember = (name: string, id: string, dept: string | null) => {
    const q = searchQuery.trim().toLowerCase();
    return (!q || name.toLowerCase().includes(q) || id.toLowerCase().includes(q))
      && (deptFilter === "all" || (dept ?? "No Department") === deptFilter);
  };
  const teamLookup = new Map((dashboard?.team ?? []).map(m => [m.employee_id, m]));

  const filteredTeam     = (dashboard?.team ?? []).filter(m => matchesMember(m.full_name, m.employee_id, m.department ?? null));
  const filteredHours    = (dashboard?.hours_summary ?? []).filter(e => matchesMember(e.full_name, e.employee_id, teamLookup.get(e.employee_id)?.department ?? null));
  const filteredUpcoming = (dashboard?.upcoming_reviews ?? []).filter(r => matchesMember(r.full_name, r.employee_id, teamLookup.get(r.employee_id)?.department ?? null));
  const filteredPastDue  = (dashboard?.past_due_reviews ?? []).filter(r => matchesMember(r.full_name, r.employee_id, teamLookup.get(r.employee_id)?.department ?? null));
  const filteredAbsences     = (dashboard?.absence_summary ?? []).filter(a => matchesMember(a.full_name, a.employee_id, teamLookup.get(a.employee_id)?.department ?? null));
  const filteredCategoryData = (dashboard?.absence_by_category ?? []).filter(a => matchesMember(a.full_name, a.employee_id, teamLookup.get(a.employee_id)?.department ?? null));

  // ── Aggregates ──
  const totalReg       = filteredHours.reduce((s, e) => s + e.regular_hours, 0);
  const totalOt        = filteredHours.reduce((s, e) => s + e.ot_hours, 0);
  const totalVacation  = filteredHours.reduce((s, e) => s + e.vacation_hours, 0);
  const totalPersonal  = filteredHours.reduce((s, e) => s + e.personal_hours, 0);
  const totalAbsWPt    = filteredHours.reduce((s, e) => s + ((e as ManagerHoursSummaryV2).absent_w_point_hours ?? 0), 0);
  const totalProtected = filteredHours.reduce((s, e) => s + ((e as ManagerHoursSummaryV2).protected_hours ?? 0), 0);
  const totalOther     = filteredHours.reduce((s, e) => s + e.other_hours, 0);
  const totalOff       = totalVacation + totalPersonal;

  const topOt = [...filteredHours]
    .filter(e => e.ot_hours > 0)
    .sort((a, b) => b.ot_hours - a.ot_hours)
    .slice(0, 5)
    .map(e => ({ name: e.full_name, id: e.employee_id, value: e.ot_hours }));

  const topPto = [...filteredHours]
    .filter(e => totalTimeOff(e) > 0)
    .sort((a, b) => totalTimeOff(b) - totalTimeOff(a))
    .slice(0, 5)
    .map(e => ({ name: e.full_name, id: e.employee_id, value: totalTimeOff(e) }));


  // ── Compare aggregates (unfiltered team-wide) ──
  const cmpTotalReg  = compareDashboard ? compareDashboard.hours_summary.reduce((s, e) => s + e.regular_hours, 0) : 0;
  const cmpTotalOt   = compareDashboard ? compareDashboard.hours_summary.reduce((s, e) => s + e.ot_hours, 0) : 0;
  const cmpTotalOff  = compareDashboard ? compareDashboard.hours_summary.reduce((s, e) => s + totalTimeOff(e), 0) : 0;

  // ── Period label ──
  const periodLabel = dashboard?.hours_date_range ?? "";

  // ── Threshold click → Analytics tab filtered to employee ──
  const handleThresholdClick = (employeeId: string) => {
    setActiveTab("analytics");
    setThresholdFilter([employeeId]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.35rem] font-bold" style={{ color: "var(--sidebar-text)" }}>
            Manager Dashboard
            {asManagerId && managersList && (
              <span className="ml-2 text-[1rem] font-normal" style={{ color: "var(--sidebar-label)" }}>
                — {managersList.find(m => m.employee_id === asManagerId)?.full_name ?? asManagerId}
              </span>
            )}
          </h1>
          {dashboard?.last_updated ? (
            <p className="mt-1 text-[0.72rem]" style={{ color: "var(--sidebar-label)" }}>
              Last updated: {formatDateTime(dashboard.last_updated)}
            </p>
          ) : (
            <p className="mt-1 text-[0.72rem]" style={{ color: "var(--sidebar-label)" }}>
              No data uploaded yet — ask HR to upload the data files.
            </p>
          )}
          {dashboard && dashboard.team_size === 0 && !asManagerId && (
            <div className="mt-3 rounded-[12px] px-4 py-3 text-[0.78rem]"
              style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.22)", color: "#92400e" }}>
              No employees are assigned to you yet. Ask an admin to set your employees' "Reports To" field to your account.
            </div>
          )}
        </div>
        {canViewAs && managersList && managersList.length > 0 && (
          <div className="shrink-0">
            <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-wide" style={{ color: "var(--sidebar-label)" }}>
              View as manager
            </p>
            <select
              value={asManagerId}
              onChange={e => { setAsManagerId(e.target.value); setSelectedEmployee(null); }}
              className="rounded-[10px] px-3 py-2 text-[0.8rem]"
              style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", outline: "none" }}
            >
              <option value="">My dashboard</option>
              {managersList.map(m => (
                <option key={m.employee_id} value={m.employee_id}>
                  {m.full_name}{m.department ? ` — ${m.department}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex items-center gap-7">
        {(["metrics", "roster", "analytics", "resources", "planning"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="pb-0.5 text-[0.85rem] font-semibold transition-colors duration-200"
            style={{
              color: activeTab === tab ? "var(--sidebar-text)" : "var(--sidebar-label)",
              borderBottom: activeTab === tab ? "2px solid var(--sidebar-text)" : "2px solid transparent",
            }}
          >
            {tab === "metrics" ? "Metrics"
              : tab === "roster" ? "Team Roster"
              : tab === "analytics" ? "Team Analytics"
              : tab === "resources" ? "Manager Hub"
              : "Workforce Planning"}
          </button>
        ))}
      </div>

      {/* ── Filter / control bar ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative" style={{ width: "260px", minWidth: "160px" }}>
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sidebar-label)" }}>
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5L14 14" />
          </svg>
          <input
            type="search"
            placeholder="Search by name or ID…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-[12px] py-2 pl-9 pr-4 text-[0.82rem] outline-none"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(153,182,218,0.4)", color: "var(--sidebar-text)" }}
          />
        </div>
        {departments.length > 1 && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="rounded-[12px] px-3 py-2 text-[0.82rem] font-medium outline-none"
            style={SELECT_STYLE}>
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="rounded-[12px] px-3 py-2 text-[0.82rem] font-medium outline-none"
          style={SELECT_STYLE}>
          {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => setCompareMode(m => !m)}
          className="rounded-[12px] px-3 py-2 text-[0.82rem] font-semibold transition-all"
          style={{
            background: compareMode ? "rgba(14,165,233,0.12)" : "rgba(255,255,255,0.72)",
            border: compareMode ? "1px solid rgba(14,165,233,0.4)" : "1px solid rgba(153,182,218,0.4)",
            color: compareMode ? "#0369a1" : "var(--sidebar-text)",
          }}>
          Compare
        </button>
        {compareMode && (
          <select value={compareMonth} onChange={e => setCompareMonth(e.target.value)}
            className="rounded-[12px] px-3 py-2 text-[0.82rem] font-medium outline-none"
            style={{ ...SELECT_STYLE, border: "1px solid rgba(14,165,233,0.3)" }}>
            {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {isFiltered && (
          <button onClick={() => { setSearchQuery(""); setDeptFilter("all"); }}
            className="rounded-[10px] px-3 py-2 text-[0.76rem] font-semibold transition-all hover:opacity-70"
            style={{ color: "var(--sidebar-label)", background: "rgba(153,182,218,0.14)" }}>
            Clear
          </button>
        )}
      </div>

      {/* ════════════════ TEAM ROSTER TAB ════════════════ */}
      {activeTab === "roster" && (
        <TeamRosterView team={filteredTeam} onSelect={setSelectedEmployee} />
      )}

      {/* ════════════════ TEAM ANALYTICS TAB ════════════════ */}
      {activeTab === "analytics" && (
        <div className="space-y-5">
          {thresholdFilter.length > 0 && (
            <div className="flex items-center gap-3 rounded-[12px] px-4 py-2.5"
              style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.25)" }}>
              <span className="text-[0.78rem] font-semibold" style={{ color: "#0369a1" }}>
                Filtered to {thresholdFilter.length} employee{thresholdFilter.length !== 1 ? "s" : ""}
              </span>
              <button onClick={() => setThresholdFilter([])}
                className="ml-auto text-[0.72rem] font-semibold hover:opacity-70 transition-opacity"
                style={{ color: "#0369a1" }}>
                Clear filter ✕
              </button>
            </div>
          )}
          <AbsenceCard
            data={thresholdFilter.length > 0 ? filteredCategoryData.filter(a => thresholdFilter.includes(a.employee_id)) : filteredCategoryData}
            dateRange={dashboard?.absence_date_range ?? null}
          />
          <AbsenceCategoryTable
            data={dashboard?.absence_by_category ?? []}
            filter={thresholdFilter}
          />
          <AttendancePointsTable
            team={filteredTeam}
            absenceByCategory={dashboard?.absence_by_category ?? []}
            filter={thresholdFilter}
            onSelectEmployee={setSelectedEmployee}
          />
        </div>
      )}

      {/* ════════════════ METRICS TAB ════════════════ */}
      {activeTab === "metrics" && (
        <>
          {/* Compare mode: two-column KPIs + donuts */}
          {isCompare && dashboard && compareDashboard ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[
                {
                  label: formatMonth(selectedMonth),
                  dash: dashboard,
                  hours: dashboard.hours_summary,
                  reg: totalReg, ot: totalOt, off: totalOff,
                  upcoming: filteredUpcoming.length,
                  pastDue: filteredPastDue.length,
                },
                {
                  label: formatMonth(compareMonth),
                  dash: compareDashboard,
                  hours: compareDashboard.hours_summary,
                  reg: cmpTotalReg, ot: cmpTotalOt, off: cmpTotalOff,
                  upcoming: compareDashboard.upcoming_reviews.length,
                  pastDue: compareDashboard.past_due_reviews.length,
                },
              ].map(col => (
                <div key={col.label} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1" style={{ background: "rgba(153,182,218,0.25)" }} />
                    <span className="text-[0.72rem] font-bold uppercase tracking-wider px-2" style={{ color: "var(--sidebar-label)" }}>
                      {col.label}
                    </span>
                    <div className="h-px flex-1" style={{ background: "rgba(153,182,218,0.25)" }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <KpiCard label="Team Size" value={col.dash.team_size} />
                    <KpiCard label="Regular Hrs" value={col.reg.toFixed(0)} />
                    <KpiCard label="OT Hours" value={col.ot.toFixed(1)} accent={col.ot > 0 ? "#d97706" : undefined} />
                    <KpiCard label="Time Off" value={col.off.toFixed(0)} />
                    <KpiCard label="Upcoming" value={col.upcoming} accent={col.upcoming > 0 ? "#0f6da3" : undefined} />
                    <KpiCard label="Past Due" value={col.pastDue} accent={col.pastDue > 0 ? "#dc2626" : undefined} />
                  </div>
                  <PtoBreakdownCard hours={col.hours} />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <KpiCard
                  label="Team Members"
                  value={isFiltered ? filteredTeam.length : (dashboard?.team_size ?? 0)}
                  sub={isFiltered ? `of ${dashboard?.team_size ?? 0} total` : undefined}
                />
                <KpiCard label="Regular Hrs" value={totalReg.toFixed(0)} />
                <KpiCard label="OT Hours" value={totalOt.toFixed(1)} accent={totalOt > 0 ? "#d97706" : undefined} />
                <KpiCard label="Time Off" value={totalOff.toFixed(0)} />
                <KpiCard label="Upcoming" value={filteredUpcoming.length} accent={filteredUpcoming.length > 0 ? "#0f6da3" : undefined} onClick={() => document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
                <KpiCard label="Past Due" value={filteredPastDue.length} accent={filteredPastDue.length > 0 ? "#dc2626" : undefined} onClick={() => document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
              </div>

              {/* ── Section: Action Items ── */}
              <div className="flex items-center gap-3">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--sidebar-label)" }}>Action Items</span>
                <div className="flex-1 h-px" style={{ background: "rgba(153,182,218,0.25)" }} />
              </div>

              {/* Reviews + Threshold alerts */}
              <div id="reviews-section" className="grid gap-4 lg:grid-cols-2">
                {/* Reviews column */}
                <div className="space-y-4">
                  <Card title={`Past Due Reviews (${filteredPastDue.length})`} accent={filteredPastDue.length > 0 ? "#dc2626" : undefined}>
                    {!dashboard || dashboard.past_due_reviews.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No past due reviews.</p>
                      </div>
                    ) : filteredPastDue.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No employees match your search.</p>
                      </div>
                    ) : (
                      <ul>
                        {filteredPastDue.map((r, i) => (
                          <li key={i} className="flex items-center justify-between gap-3 px-5 py-3"
                            style={{ borderBottom: i < filteredPastDue.length - 1 ? "1px solid rgba(153,182,218,0.12)" : "none" }}>
                            <div className="min-w-0">
                              <p className="truncate text-[0.82rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{r.full_name}</p>
                              <p className="text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
                                {reviewTypeBadge(r.review_type)} · Was due {formatDate(r.due_date)}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
                              style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                              {r.days_overdue}d overdue
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <div className="overflow-hidden rounded-[16px]" style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(153,182,218,0.28)", boxShadow: "0 2px 12px rgba(12,24,47,0.07)" }}>
                    <button
                      onClick={() => setUpcomingExpanded(e => !e)}
                      className="flex w-full items-center justify-between px-5 py-4 transition-opacity hover:opacity-80"
                    >
                      <span className="text-[0.8rem] font-bold" style={{ color: "var(--sidebar-text)" }}>
                        Upcoming Performance Reviews ({filteredUpcoming.length})
                      </span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        style={{ color: "var(--sidebar-label)", transform: upcomingExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                        <path d="M2 4l4 4 4-4" />
                      </svg>
                    </button>
                    {upcomingExpanded && (
                      <div style={{ borderTop: "1px solid rgba(153,182,218,0.18)" }}>
                        {!dashboard || dashboard.upcoming_reviews.length === 0 ? (
                          <div className="px-5 py-6 text-center">
                            <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No upcoming reviews.</p>
                          </div>
                        ) : filteredUpcoming.length === 0 ? (
                          <div className="px-5 py-6 text-center">
                            <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No employees match your search.</p>
                          </div>
                        ) : (
                          <ul>
                            {filteredUpcoming.map((r, i) => (
                              <li key={i} className="flex items-center justify-between gap-3 px-5 py-3"
                                style={{ borderBottom: i < filteredUpcoming.length - 1 ? "1px solid rgba(153,182,218,0.12)" : "none" }}>
                                <div className="min-w-0">
                                  <p className="truncate text-[0.82rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>{r.full_name}</p>
                                  <p className="text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
                                    {reviewTypeBadge(r.review_type)} · Due {formatDate(r.due_date)}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
                                  style={{ background: `${daysUntilColor(r.days_until ?? 0)}18`, color: daysUntilColor(r.days_until ?? 0) }}>
                                  {r.days_until === 0 ? "Today" : `${r.days_until}d`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Threshold alerts column */}
                {dashboard && (
                  <ThresholdAlertsCard team={dashboard.team} onClickEmployee={handleThresholdClick} />
                )}
              </div>

              {/* ── Section: Analytics ── */}
              <div className="flex items-center gap-3">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--sidebar-label)" }}>Analytics</span>
                <div className="flex-1 h-px" style={{ background: "rgba(153,182,218,0.25)" }} />
              </div>

              {/* Insights row */}
              {filteredHours.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <PtoBreakdownCard hours={filteredHours} />
                  <LeaderboardCard title="Top OT Hours" entries={topOt} accent="#d97706" emptyMsg="No overtime recorded this period." />
                  <LeaderboardCard title="Most Time Off Used" entries={topPto} accent="#0ea5e9" emptyMsg="No time off recorded this period." />
                </div>
              )}

              {/* Absence overview */}
              <AbsenceCard
                data={filteredCategoryData}
                dateRange={dashboard?.absence_date_range ?? null}
              />

              {/* Hours detail — collapsed by default */}
              <div>
                <button
                  onClick={() => setHoursExpanded(e => !e)}
                  className="flex w-full items-center justify-between rounded-[14px] px-5 py-3.5 text-[0.8rem] font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    border: "1px solid rgba(153,182,218,0.28)",
                    boxShadow: "0 2px 8px rgba(12,24,47,0.06)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  <span>Hours Detail{periodLabel ? ` — ${periodLabel}` : ""}</span>
                  <div className="flex items-center gap-2" style={{ color: "var(--sidebar-label)" }}>
                    <span className="text-[0.72rem] font-normal">{hoursExpanded ? "collapse" : `${filteredHours.length} employees`}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: hoursExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      <path d="M2 4l4 4 4-4" />
                    </svg>
                  </div>
                </button>
                {hoursExpanded && (
                  <div className="mt-2 overflow-hidden rounded-[14px]" style={{ border: "1px solid rgba(153,182,218,0.28)", background: "rgba(255,255,255,0.72)", boxShadow: "0 2px 8px rgba(12,24,47,0.06)" }}>
                    {!dashboard || dashboard.hours_summary.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>
                          No time data yet. HR uploads the weekly hours file each Monday.
                        </p>
                      </div>
                    ) : filteredHours.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No employees match your search.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[0.8rem]">
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(153,182,218,0.2)" }}>
                              {["Employee", "Regular", "OT", "Vacation", "Personal", "Abs w/Pt", "Protected", "Other", "Uploads"].map(h => (
                                <th key={h}
                                  className={cn("px-4 py-3 text-[0.64rem] font-bold uppercase tracking-[0.1em]", h !== "Employee" ? "text-right" : "text-left")}
                                  style={{ color: "var(--sidebar-label)" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHours.map((emp, i) => {
                              const v2 = emp as ManagerHoursSummaryV2;
                              return (
                                <tr key={emp.employee_id} style={{ borderBottom: i < filteredHours.length - 1 ? "1px solid rgba(153,182,218,0.12)" : "none" }}>
                                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--sidebar-text)" }}>
                                    {emp.full_name}
                                    <span className="ml-2 text-[0.65rem] font-normal" style={{ color: "var(--sidebar-label)" }}>{emp.employee_id}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--sidebar-text)" }}>{emp.regular_hours.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: emp.ot_hours > 0 ? "#d97706" : "var(--sidebar-label)" }}>{emp.ot_hours.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: emp.vacation_hours > 0 ? "#0ea5e9" : "var(--sidebar-label)" }}>{emp.vacation_hours.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: emp.personal_hours > 0 ? "#8b5cf6" : "var(--sidebar-label)" }}>{emp.personal_hours.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: (v2.absent_w_point_hours ?? 0) > 0 ? "#dc2626" : "var(--sidebar-label)" }}>{(v2.absent_w_point_hours ?? 0).toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: (v2.protected_hours ?? 0) > 0 ? "#16a34a" : "var(--sidebar-label)" }}>{(v2.protected_hours ?? 0).toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: emp.other_hours > 0 ? "#f59e0b" : "var(--sidebar-label)" }}>{emp.other_hours.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right tabular-nums text-[0.72rem]"
                                    style={{ color: emp.weeks_included < (dashboard?.hours_week_count ?? 1) ? "#d97706" : "var(--sidebar-label)" }}>
                                    {emp.weeks_included}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: "1px solid rgba(153,182,218,0.25)", background: "rgba(153,182,218,0.06)" }}>
                              <td className="px-4 py-3 text-[0.72rem] font-bold" style={{ color: "var(--sidebar-label)" }}>Team Total</td>
                              <td className="px-4 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalReg.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: totalOt > 0 ? "#d97706" : "var(--sidebar-text)" }}>{totalOt.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalVacation.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalPersonal.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalAbsWPt.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalProtected.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalOther.toFixed(1)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ════════════════ MANAGER HUB TAB ════════════════ */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--sidebar-label)" }}>Department Overview</span>
            <div className="h-px flex-1" style={{ background: "rgba(153,182,218,0.25)" }} />
          </div>
          <DepartmentDashboardSection
            teamSize={dashboard?.team_size ?? 0}
            upcomingReviews={filteredUpcoming.length}
            pastDue={filteredPastDue.length}
            onboardingTeam={dashboard?.team ?? []}
          />
          <div className="flex items-center gap-3">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--sidebar-label)" }}>Performance Review Calendar</span>
            <div className="h-px flex-1" style={{ background: "rgba(153,182,218,0.25)" }} />
          </div>
          <ReviewCalendarSection
            upcoming={filteredUpcoming}
            pastDue={filteredPastDue}
            managerName={user?.full_name ?? "Manager"}
          />
        </div>
      )}

      {/* ════════════════ WORKFORCE PLANNING TAB ════════════════ */}
      {activeTab === "planning" && (
        <WorkforcePlanningSection
          checks={planningChecks}
          onToggle={(id, val) => setPlanningChecks(prev => ({ ...prev, [id]: val }))}
        />
      )}

      {/* ── Employee Detail Panel (all tabs) ── */}
      {selectedEmployee && (
        <EmployeeDetailPanel
          employee={selectedEmployee}
          month={selectedMonth}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
