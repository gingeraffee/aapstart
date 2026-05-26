"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { managerApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ManagerDashboardData, ManagerHoursSummary, ManagerTeamMember, AbsenceEmployeeSummary } from "@/lib/types";

const TRACK_LABELS: Record<string, string> = {
  hr: "HR",
  warehouse: "Warehouse",
  administrative: "Administrative",
  management: "Management",
};

const TRACK_COLORS: Record<string, { bg: string; text: string }> = {
  hr: { bg: "rgba(59,130,246,0.1)", text: "#1d4ed8" },
  warehouse: { bg: "rgba(245,158,11,0.1)", text: "#92400e" },
  administrative: { bg: "rgba(168,85,247,0.1)", text: "#7e22ce" },
  management: { bg: "rgba(22,163,74,0.1)", text: "#15803d" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
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

function totalTimeOff(e: ManagerHoursSummary): number {
  return e.vacation_hours + e.personal_hours + e.other_hours;
}

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

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div
      className="rounded-[14px] p-4"
      style={{
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 8px rgba(12,24,47,0.06)",
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
      {/* Track ring */}
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

// ── PTO Breakdown card ────────────────────────────────────────────────────────

const PTO_SLICES = [
  { key: "vacation_hours" as const, label: "Vacation", color: "#0ea5e9" },
  { key: "personal_hours" as const, label: "Personal", color: "#8b5cf6" },
  { key: "other_hours"   as const, label: "Other",    color: "#f59e0b" },
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
                    <div className="h-full rounded-full" style={{ width: `${Math.round((s.value / total) * 100)}%`, background: s.color }} />
                  </div>
                </div>
                <span className="w-8 shrink-0 text-right text-[0.68rem] font-medium tabular-nums" style={{ color: "var(--sidebar-label)" }}>
                  {Math.round((s.value / total) * 100)}%
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

  const totalReg  = hours.reduce((s, e) => s + e.regular_hours, 0);
  const totalOt   = hours.reduce((s, e) => s + e.ot_hours, 0);
  const totalOff  = hours.reduce((s, e) => s + totalTimeOff(e), 0);
  const withOt    = hours.filter(e => e.ot_hours > 0);
  const noHours   = hours.filter(e => e.regular_hours === 0);
  const avgReg    = totalReg / hours.length;

  // OT rate
  if (totalReg > 0) {
    const otRate = (totalOt / totalReg) * 100;
    signals.push({
      icon: "⏱",
      text: `${otRate.toFixed(1)}% OT rate${totalReg > 0 ? ` · ${avgReg.toFixed(0)}h avg/person` : ""}`,
      tone: otRate > 15 ? "warning" : "neutral",
    });
  }

  // OT concentration
  if (withOt.length > 0) {
    const topOtWorker = [...hours].sort((a, b) => b.ot_hours - a.ot_hours)[0];
    const concentration = totalOt > 0 ? Math.round((topOtWorker.ot_hours / totalOt) * 100) : 0;
    signals.push({
      icon: "⚡",
      text: `${withOt.length} of ${hours.length} working OT${concentration >= 60 && withOt.length > 1 ? ` · ${concentration}% concentrated on 1 person` : ""}`,
      tone: concentration >= 60 && withOt.length > 1 ? "warning" : "neutral",
    });
  }

  // Time-off rate
  if (totalOff > 0 && totalReg > 0) {
    const offRate = (totalOff / (totalReg + totalOff)) * 100;
    signals.push({
      icon: "🌴",
      text: `${offRate.toFixed(1)}% of hours taken as time off this period`,
      tone: "neutral",
    });
  }

  // Missing hours
  if (noHours.length > 0) {
    signals.push({
      icon: "⚠",
      text: `${noHours.length} employee${noHours.length > 1 ? "s" : ""} with no regular hours — check upload`,
      tone: "warning",
    });
  }

  // Upcoming reviews this week
  if (upcomingReviews > 0) {
    signals.push({
      icon: "📋",
      text: `${upcomingReviews} upcoming review${upcomingReviews > 1 ? "s" : ""}${pastDue > 0 ? ` · ${pastDue} past due` : ""}`,
      tone: pastDue > 0 ? "danger" : "info",
    });
  } else if (pastDue > 0) {
    signals.push({ icon: "🚨", text: `${pastDue} review${pastDue > 1 ? "s" : ""} past due`, tone: "danger" });
  }

  if (signals.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {signals.map((s, i) => <Signal key={i} {...s} />)}
    </div>
  );
}

// ── Planned vs. Unplanned Absence card ───────────────────────────────────────

function AbsenceDonut({ planned, unplanned }: { planned: number; unplanned: number }) {
  const total = planned + unplanned;
  const R = 44, CX = 56, CY = 56, SW = 17;
  const C = 2 * Math.PI * R;
  const slices = [
    { label: "Planned", value: planned, color: "#16a34a" },
    { label: "Unplanned", value: unplanned, color: "#dc2626" },
  ];
  let cumPct = 0;
  return (
    <svg width="112" height="112" viewBox="0 0 112 112">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(153,182,218,0.15)" strokeWidth={SW} />
      {total > 0 && slices.filter(d => d.value > 0).map((d) => {
        const pct = d.value / total;
        const dash = Math.max(0, pct * C - 1.5);
        const rotation = cumPct * 360 - 90;
        cumPct += pct;
        return (
          <circle key={d.label} cx={CX} cy={CY} r={R} fill="none" stroke={d.color}
            strokeWidth={SW} strokeDasharray={`${dash} ${C}`}
            transform={`rotate(${rotation} ${CX} ${CY})`} />
        );
      })}
      {total > 0 ? (
        <>
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--sidebar-text)">{total}</text>
          <text x={CX} y={CY + 9} textAnchor="middle" fontSize="6.5" fill="var(--sidebar-label)">INCIDENTS</text>
        </>
      ) : (
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="8" fill="var(--sidebar-label)">No data</text>
      )}
    </svg>
  );
}

function AbsenceCard({
  summary, totalPlanned, totalUnplanned, dateRange,
}: {
  summary: AbsenceEmployeeSummary[];
  totalPlanned: number;
  totalUnplanned: number;
  dateRange: string | null;
}) {
  const total = totalPlanned + totalUnplanned;
  const unplannedRate = total > 0 ? Math.round((totalUnplanned / total) * 100) : 0;

  return (
    <Card title={`Planned vs. Unplanned Absences${dateRange ? ` — ${dateRange}` : ""}`}>
      {total === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>
            No absence data yet. Upload the Time Off Used report to see planned vs. unplanned breakdown.
          </p>
        </div>
      ) : (
        <div className="px-5 py-5 space-y-5">
          {/* Summary row */}
          <div className="flex items-center gap-6">
            <AbsenceDonut planned={totalPlanned} unplanned={totalUnplanned} />
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: "#16a34a" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[0.74rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>Planned</span>
                    <span className="text-[0.74rem] font-bold tabular-nums" style={{ color: "#16a34a" }}>{totalPlanned}</span>
                  </div>
                  <div className="mt-0.5 h-[5px] w-full rounded-full overflow-hidden" style={{ background: "rgba(153,182,218,0.15)" }}>
                    <div className="h-full rounded-full" style={{ width: `${total > 0 ? Math.round((totalPlanned / total) * 100) : 0}%`, background: "#16a34a" }} />
                  </div>
                </div>
                <span className="w-8 shrink-0 text-right text-[0.68rem] font-medium tabular-nums" style={{ color: "var(--sidebar-label)" }}>
                  {total > 0 ? Math.round((totalPlanned / total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: "#dc2626" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[0.74rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>Unplanned</span>
                    <span className="text-[0.74rem] font-bold tabular-nums" style={{ color: "#dc2626" }}>{totalUnplanned}</span>
                  </div>
                  <div className="mt-0.5 h-[5px] w-full rounded-full overflow-hidden" style={{ background: "rgba(153,182,218,0.15)" }}>
                    <div className="h-full rounded-full" style={{ width: `${unplannedRate}%`, background: "#dc2626" }} />
                  </div>
                </div>
                <span className="w-8 shrink-0 text-right text-[0.68rem] font-medium tabular-nums" style={{ color: "var(--sidebar-label)" }}>
                  {unplannedRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Per-employee table */}
          {summary.length > 0 && (
            <div className="overflow-x-auto rounded-[12px]" style={{ border: "1px solid rgba(153,182,218,0.18)" }}>
              <table className="w-full text-[0.78rem]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(153,182,218,0.18)", background: "rgba(153,182,218,0.06)" }}>
                    <th className="px-4 py-2.5 text-left text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Employee</th>
                    <th className="px-4 py-2.5 text-right text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "#16a34a" }}>Planned</th>
                    <th className="px-4 py-2.5 text-right text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "#dc2626" }}>Unplanned</th>
                    <th className="px-4 py-2.5 text-right text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary]
                    .sort((a, b) => (b.unplanned_count + b.planned_count) - (a.unplanned_count + a.planned_count))
                    .map((emp, i, arr) => (
                      <tr key={emp.employee_id} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(153,182,218,0.1)" : "none" }}>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--sidebar-text)" }}>
                          {emp.full_name}
                          <span className="ml-2 text-[0.62rem] font-normal" style={{ color: "var(--sidebar-label)" }}>{emp.employee_id}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: emp.planned_count > 0 ? "#16a34a" : "var(--sidebar-label)" }}>
                          {emp.planned_count}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: emp.unplanned_count > 0 ? "#dc2626" : "var(--sidebar-label)" }}>
                          {emp.unplanned_count}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "var(--sidebar-text)" }}>
                          {emp.planned_count + emp.unplanned_count}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Team Roster ───────────────────────────────────────────────────────────────

function EmployeeCard({ member }: { member: ManagerTeamMember }) {
  const lastLogin = member.last_login_at
    ? formatDate(member.last_login_at)
    : member.first_login_at ? "Never logged in" : "Not yet enrolled";

  return (
    <div
      className="rounded-[14px] p-4"
      style={{
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 6px rgba(12,24,47,0.05)",
      }}
    >
      <p className="text-[0.88rem] font-bold leading-tight" style={{ color: "var(--sidebar-text)" }}>{member.full_name}</p>
      <p className="mt-0.5 text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>{member.employee_id}</p>
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
      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "rgba(153,182,218,0.2)" }}>
        <div>
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Last Login</p>
          <p className="mt-0.5 text-[0.72rem] font-medium" style={{ color: "var(--sidebar-text)" }}>{lastLogin}</p>
        </div>
        <div className="text-right">
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--sidebar-label)" }}>Modules</p>
          <p className="mt-0.5 text-[0.72rem] font-medium" style={{ color: "var(--sidebar-text)" }}>{member.modules_completed} done</p>
        </div>
      </div>
    </div>
  );
}

function TeamRosterView({ team }: { team: ManagerTeamMember[] }) {
  if (team.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[0.85rem]" style={{ color: "var(--sidebar-label)" }}>
          No team members assigned yet. Ask an admin to assign employees to you.
        </p>
      </div>
    );
  }

  const groups = new Map<string, ManagerTeamMember[]>();
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
            {members.map((m) => <EmployeeCard key={m.employee_id} member={m} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const canAccess = user?.is_manager || user?.is_admin;
  const [activeTab, setActiveTab] = useState<"metrics" | "team">("metrics");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [weeks, setWeeks] = useState(4);

  useEffect(() => {
    if (!authLoading && !canAccess) router.replace("/overview");
  }, [authLoading, canAccess, router]);

  const { data, error, isLoading } = useSWR(
    canAccess ? ["manager-dashboard", weeks] : null,
    () => managerApi.dashboard(weeks),
    { revalidateOnFocus: false }
  );

  if (authLoading || (!data && isLoading)) {
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

  const dashboard = data as ManagerDashboardData | undefined;

  // ── Filters ──
  const departments = [...new Set(
    (dashboard?.team ?? []).map((m) => m.department ?? "No Department")
  )].sort((a, b) => a === "No Department" ? 1 : b === "No Department" ? -1 : a.localeCompare(b));

  const isFiltered = searchQuery.trim() !== "" || deptFilter !== "all";
  const matchesMember = (name: string, id: string, dept: string | null) => {
    const q = searchQuery.trim().toLowerCase();
    return (!q || name.toLowerCase().includes(q) || id.toLowerCase().includes(q))
      && (deptFilter === "all" || (dept ?? "No Department") === deptFilter);
  };
  const teamLookup = new Map((dashboard?.team ?? []).map((m) => [m.employee_id, m]));

  const filteredTeam     = (dashboard?.team ?? []).filter((m) => matchesMember(m.full_name, m.employee_id, m.department ?? null));
  const filteredHours    = (dashboard?.hours_summary ?? []).filter((e) => matchesMember(e.full_name, e.employee_id, teamLookup.get(e.employee_id)?.department ?? null));
  const filteredUpcoming = (dashboard?.upcoming_reviews ?? []).filter((r) => matchesMember(r.full_name, r.employee_id, teamLookup.get(r.employee_id)?.department ?? null));
  const filteredPastDue  = (dashboard?.past_due_reviews ?? []).filter((r) => matchesMember(r.full_name, r.employee_id, teamLookup.get(r.employee_id)?.department ?? null));
  const filteredAbsences = (dashboard?.absence_summary ?? []).filter((a) => matchesMember(a.full_name, a.employee_id, teamLookup.get(a.employee_id)?.department ?? null));

  // ── Aggregates ──
  const totalReg      = filteredHours.reduce((s, e) => s + e.regular_hours, 0);
  const totalOt       = filteredHours.reduce((s, e) => s + e.ot_hours, 0);
  const totalVacation = filteredHours.reduce((s, e) => s + e.vacation_hours, 0);
  const totalPersonal = filteredHours.reduce((s, e) => s + e.personal_hours, 0);
  const totalOther    = filteredHours.reduce((s, e) => s + e.other_hours, 0);
  const totalOff      = totalVacation + totalPersonal + totalOther;

  // ── Leaderboard data ──
  const topOt = [...filteredHours]
    .filter(e => e.ot_hours > 0)
    .sort((a, b) => b.ot_hours - a.ot_hours)
    .slice(0, 3)
    .map(e => ({ name: e.full_name, id: e.employee_id, value: e.ot_hours }));

  const topPto = [...filteredHours]
    .filter(e => totalTimeOff(e) > 0)
    .sort((a, b) => totalTimeOff(b) - totalTimeOff(a))
    .slice(0, 3)
    .map(e => ({ name: e.full_name, id: e.employee_id, value: totalTimeOff(e) }));

  const filteredPlanned   = filteredAbsences.reduce((s, a) => s + a.planned_count, 0);
  const filteredUnplanned = filteredAbsences.reduce((s, a) => s + a.unplanned_count, 0);

  // ── Period label ──
  const periodLabel = dashboard?.hours_week_count
    ? `${dashboard.hours_date_range ?? ""}${(dashboard.hours_week_count ?? 0) > 1 ? ` (${dashboard.hours_week_count} uploads)` : ""}`
    : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-[1.35rem] font-bold" style={{ color: "var(--sidebar-text)" }}>Manager Dashboard</h1>
        {dashboard?.last_updated ? (
          <p className="mt-1 text-[0.72rem]" style={{ color: "var(--sidebar-label)" }}>
            Last updated: {formatDateTime(dashboard.last_updated)}
          </p>
        ) : (
          <p className="mt-1 text-[0.72rem]" style={{ color: "var(--sidebar-label)" }}>
            No data uploaded yet — ask HR to upload the weekly file.
          </p>
        )}
        {dashboard && dashboard.team_size === 0 && (
          <div className="mt-3 rounded-[12px] px-4 py-3 text-[0.78rem]" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.22)", color: "#92400e" }}>
            No employees are assigned to you yet. Ask an admin to set your employees' "Reports To" field to your account.
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 self-start rounded-[12px] p-1"
        style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", boxShadow: "var(--tab-group-shadow)" }}>
        {(["metrics", "team"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="rounded-[9px] px-5 py-1.5 text-[0.8rem] font-semibold capitalize transition-all duration-200"
            style={{
              color: activeTab === tab ? "var(--tab-text-active)" : "var(--tab-text)",
              ...(activeTab === tab ? { background: "var(--tab-active-bg)", boxShadow: "var(--tab-active-shadow)" } : {}),
            }}
          >
            {tab === "metrics" ? "Metrics" : "Team Roster"}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1" style={{ minWidth: "180px" }}>
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--sidebar-label)" }}>
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5L14 14" />
          </svg>
          <input
            type="search"
            placeholder="Search by name or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[12px] py-2 pl-9 pr-4 text-[0.82rem] outline-none"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(153,182,218,0.4)", color: "var(--sidebar-text)" }}
          />
        </div>
        {departments.length > 1 && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-[12px] px-3 py-2 text-[0.82rem] font-medium outline-none"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(153,182,218,0.4)", color: "var(--sidebar-text)" }}>
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {activeTab === "metrics" && (
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}
            className="rounded-[12px] px-3 py-2 text-[0.82rem] font-medium outline-none"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(153,182,218,0.4)", color: "var(--sidebar-text)" }}>
            <option value={4}>Last 4 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={13}>Last 3 months</option>
            <option value={26}>Last 6 months</option>
            <option value={52}>Last year</option>
            <option value={0}>All time</option>
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
      {activeTab === "team" ? (
        <TeamRosterView team={filteredTeam} />
      ) : (
        <>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Team Members"
            value={isFiltered ? filteredTeam.length : (dashboard?.team_size ?? 0)}
            sub={isFiltered ? `of ${dashboard?.team_size ?? 0} total` : undefined}
          />
          <KpiCard label="Regular Hrs" value={totalReg.toFixed(0)} />
          <KpiCard label="OT Hours" value={totalOt.toFixed(1)} accent={totalOt > 0 ? "#d97706" : undefined} />
          <KpiCard label="Time Off" value={totalOff.toFixed(0)} />
          <KpiCard
            label="Upcoming Reviews"
            value={filteredUpcoming.length}
            accent={filteredUpcoming.length > 0 ? "#0f6da3" : undefined}
          />
          <KpiCard
            label="Past Due"
            value={filteredPastDue.length}
            accent={filteredPastDue.length > 0 ? "#dc2626" : undefined}
          />
        </div>

        {/* ── Insights row: donut + leaderboards ── */}
        {filteredHours.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            <PtoBreakdownCard hours={filteredHours} />
            <LeaderboardCard
              title="Top OT Hours"
              entries={topOt}
              accent="#d97706"
              emptyMsg="No overtime recorded this period."
            />
            <LeaderboardCard
              title="Most Time Off Used"
              entries={topPto}
              accent="#0ea5e9"
              emptyMsg="No time off recorded this period."
            />
          </div>
        )}

        {/* ── Staffing signals ── */}
        <StaffingSignals
          hours={filteredHours}
          teamSize={dashboard?.team_size ?? 0}
          upcomingReviews={filteredUpcoming.length}
          pastDue={filteredPastDue.length}
        />

        {/* ── Absence overview ── */}
        <AbsenceCard
          summary={filteredAbsences}
          totalPlanned={filteredPlanned}
          totalUnplanned={filteredUnplanned}
          dateRange={dashboard?.absence_date_range ?? null}
        />

        {/* ── Full hours detail table ── */}
        <Card title={`Hours Detail${periodLabel ? ` — ${periodLabel}` : ""}`}>
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
                    {["Employee", "Regular", "OT", "Vacation", "Personal", "Other", "Uploads"].map((h) => (
                      <th
                        key={h}
                        className={cn("px-5 py-3 text-[0.64rem] font-bold uppercase tracking-[0.1em]", h !== "Employee" ? "text-right" : "text-left")}
                        style={{ color: "var(--sidebar-label)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHours.map((emp, i) => (
                    <tr key={emp.employee_id} style={{ borderBottom: i < filteredHours.length - 1 ? "1px solid rgba(153,182,218,0.12)" : "none" }}>
                      <td className="px-5 py-3 font-semibold" style={{ color: "var(--sidebar-text)" }}>
                        {emp.full_name}
                        <span className="ml-2 text-[0.65rem] font-normal" style={{ color: "var(--sidebar-label)" }}>{emp.employee_id}</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums" style={{ color: "var(--sidebar-text)" }}>{emp.regular_hours.toFixed(1)}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: emp.ot_hours > 0 ? "#d97706" : "var(--sidebar-label)" }}>{emp.ot_hours.toFixed(1)}</td>
                      <td className="px-5 py-3 text-right tabular-nums" style={{ color: emp.vacation_hours > 0 ? "#0ea5e9" : "var(--sidebar-label)" }}>{emp.vacation_hours.toFixed(1)}</td>
                      <td className="px-5 py-3 text-right tabular-nums" style={{ color: emp.personal_hours > 0 ? "#8b5cf6" : "var(--sidebar-label)" }}>{emp.personal_hours.toFixed(1)}</td>
                      <td className="px-5 py-3 text-right tabular-nums" style={{ color: emp.other_hours > 0 ? "#f59e0b" : "var(--sidebar-label)" }}>{emp.other_hours.toFixed(1)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[0.72rem]"
                        style={{ color: emp.weeks_included < (dashboard?.hours_week_count ?? 1) ? "#d97706" : "var(--sidebar-label)" }}>
                        {emp.weeks_included}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid rgba(153,182,218,0.25)", background: "rgba(153,182,218,0.06)" }}>
                    <td className="px-5 py-3 text-[0.72rem] font-bold" style={{ color: "var(--sidebar-label)" }}>Team Total</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalReg.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: totalOt > 0 ? "#d97706" : "var(--sidebar-text)" }}>{totalOt.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalVacation.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalPersonal.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalOther.toFixed(1)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {/* ── Reviews ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`Upcoming Performance Reviews (${filteredUpcoming.length})`}>
            {!dashboard || dashboard.upcoming_reviews.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No upcoming reviews.</p>
              </div>
            ) : filteredUpcoming.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No employees match your search.</p>
              </div>
            ) : (
              <ul>
                {filteredUpcoming.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5"
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
          </Card>

          <Card title={`Past Due Reviews (${filteredPastDue.length})`} accent={filteredPastDue.length > 0 ? "#dc2626" : undefined}>
            {!dashboard || dashboard.past_due_reviews.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No past due reviews.</p>
              </div>
            ) : filteredPastDue.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No employees match your search.</p>
              </div>
            ) : (
              <ul>
                {filteredPastDue.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5"
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
        </div>

        </>
      )}
    </div>
  );
}
