"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { managerApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { ManagerDashboardData, ManagerTeamMember } from "@/lib/types";

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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntilColor(days: number): string {
  if (days <= 7) return "#dc2626";   // red — due very soon
  if (days <= 14) return "#d97706";  // amber — within 2 weeks
  return "#16a34a";                  // green — plenty of time
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

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <p className="mb-1 text-[0.64rem] font-bold uppercase tracking-[0.13em]" style={{ color: "var(--sidebar-label)" }}>
        {label}
      </p>
      <p className="text-[1.55rem] font-bold leading-none" style={{ color: accent ?? "var(--sidebar-text)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="rounded-[16px] overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 8px rgba(12,24,47,0.06)",
      }}
    >
      <div
        className="px-5 py-3.5"
        style={{
          borderBottom: "1px solid rgba(153,182,218,0.22)",
          background: accent ? `${accent}08` : "rgba(255,255,255,0.5)",
        }}
      >
        <h2 className="text-[0.82rem] font-bold" style={{ color: accent ?? "var(--sidebar-text)" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ── Team Roster ───────────────────────────────────────────────────────────────

function EmployeeCard({ member }: { member: ManagerTeamMember }) {
  const lastLogin = member.last_login_at
    ? formatDate(member.last_login_at)
    : member.first_login_at
      ? "Never logged in"
      : "Not yet enrolled";

  return (
    <div
      className="rounded-[14px] p-4 transition-all duration-150"
      style={{
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(153,182,218,0.28)",
        boxShadow: "0 2px 6px rgba(12,24,47,0.05)",
      }}
    >
      {/* Name + ID */}
      <p className="text-[0.88rem] font-bold leading-tight" style={{ color: "var(--sidebar-text)" }}>
        {member.full_name}
      </p>
      <p className="mt-0.5 text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
        {member.employee_id}
      </p>

      {/* Department */}
      {member.department && (
        <p className="mt-2 text-[0.74rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>
          {member.department}
        </p>
      )}

      {/* Track badges */}
      <div className="mt-2 flex flex-wrap gap-1">
        {member.tracks.map((t) => {
          const color = TRACK_COLORS[t] ?? { bg: "rgba(100,116,139,0.1)", text: "#475569" };
          return (
            <span
              key={t}
              className="rounded-full px-2 py-0.5 text-[0.64rem] font-semibold"
              style={{ background: color.bg, color: color.text }}
            >
              {TRACK_LABELS[t] ?? t}
            </span>
          );
        })}
      </div>

      {/* Stats row */}
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

  // Group by department; employees with no department go under "Unassigned"
  const groups = new Map<string, ManagerTeamMember[]>();
  for (const member of team) {
    const key = member.department ?? "No Department";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(member);
  }

  // Sort: named departments alphabetically, "No Department" last
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
            <span
              className="rounded-full px-2 py-0.5 text-[0.64rem] font-semibold"
              style={{ background: "rgba(153,182,218,0.18)", color: "var(--sidebar-label)" }}
            >
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

  useEffect(() => {
    if (!authLoading && !canAccess) {
      router.replace("/overview");
    }
  }, [authLoading, canAccess, router]);

  const { data, error, isLoading, mutate } = useSWR(
    canAccess ? "manager-dashboard" : null,
    () => managerApi.dashboard(),
    { revalidateOnFocus: false }
  );

  if (authLoading || (!data && isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
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

  // Derive unique departments for the filter dropdown
  const departments = [...new Set(
    (dashboard?.team ?? []).map((m) => m.department ?? "No Department")
  )].sort((a, b) => a === "No Department" ? 1 : b === "No Department" ? -1 : a.localeCompare(b));

  // Shared filter: applies to team roster, hours table, and reviews
  const isFiltered = searchQuery.trim() !== "" || deptFilter !== "all";
  const matchesMember = (name: string, id: string, dept: string | null) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
    const matchesDept = deptFilter === "all" || (dept ?? "No Department") === deptFilter;
    return matchesSearch && matchesDept;
  };
  const teamLookup = new Map((dashboard?.team ?? []).map((m) => [m.employee_id, m]));

  const filteredTeam = (dashboard?.team ?? []).filter((m) =>
    matchesMember(m.full_name, m.employee_id, m.department ?? null)
  );
  const filteredHours = (dashboard?.hours_summary ?? []).filter((e) => {
    const dept = teamLookup.get(e.employee_id)?.department ?? null;
    return matchesMember(e.full_name, e.employee_id, dept);
  });
  const filteredUpcoming = (dashboard?.upcoming_reviews ?? []).filter((r) => {
    const dept = teamLookup.get(r.employee_id)?.department ?? null;
    return matchesMember(r.full_name, r.employee_id, dept);
  });
  const filteredPastDue = (dashboard?.past_due_reviews ?? []).filter((r) => {
    const dept = teamLookup.get(r.employee_id)?.department ?? null;
    return matchesMember(r.full_name, r.employee_id, dept);
  });

  const totalHours = filteredHours.reduce((s, e) => s + e.regular_hours, 0);
  const totalOt = filteredHours.reduce((s, e) => s + e.ot_hours, 0);
  const totalPto = filteredHours.reduce((s, e) => s + e.pto_hours, 0);

  return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
        {/* ── Page header ── */}
        <div>
          <h1 className="text-[1.35rem] font-bold" style={{ color: "var(--sidebar-text)" }}>
            Manager Dashboard
          </h1>
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

        {/* ── Tab switcher ── */}
        <div
          className="flex gap-1 self-start rounded-[12px] p-1"
          style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)", boxShadow: "var(--tab-group-shadow)" }}
        >
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

        {/* ── Search + filter bar ── */}
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
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-[12px] px-3 py-2 text-[0.82rem] font-medium outline-none"
              style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(153,182,218,0.4)", color: "var(--sidebar-text)" }}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          {isFiltered && (
            <button
              onClick={() => { setSearchQuery(""); setDeptFilter("all"); }}
              className="rounded-[10px] px-3 py-2 text-[0.76rem] font-semibold transition-all hover:opacity-70"
              style={{ color: "var(--sidebar-label)", background: "rgba(153,182,218,0.14)" }}
            >
              Clear
            </button>
          )}
        </div>

        {activeTab === "team" ? (
          <TeamRosterView team={filteredTeam} />
        ) : (<>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Team Members"
            value={isFiltered ? filteredTeam.length : (dashboard?.team_size ?? 0)}
            sub={isFiltered ? `of ${dashboard?.team_size ?? 0} total` : undefined}
          />
          <KpiCard label="Hours (30 days)" value={totalHours.toFixed(1)} />
          <KpiCard label="OT Hours" value={totalOt.toFixed(1)} accent={totalOt > 0 ? "#d97706" : undefined} />
          <KpiCard label="PTO Hours" value={totalPto.toFixed(1)} />
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

        {/* ── Hours & PTO Table ── */}
        <SectionCard
          title={
            dashboard?.hours_week_count
              ? `Hours & PTO${dashboard.hours_date_range ? ` — ${dashboard.hours_date_range}` : ""}${dashboard.hours_week_count > 1 ? ` (${dashboard.hours_week_count} weeks summed)` : ""}`
              : "Hours & PTO — Last 30 Days"
          }
        >
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
              {(dashboard?.hours_week_count ?? 0) > 1 && (
                <div className="px-5 pt-3 pb-1">
                  <p className="text-[0.72rem] rounded-[8px] px-3 py-1.5 inline-block" style={{ background: "rgba(217,119,6,0.08)", color: "#92400e", border: "1px solid rgba(217,119,6,0.18)" }}>
                    Hours shown are totals across {dashboard?.hours_week_count} weeks. Use the "Weeks" column to spot employees with fewer uploads.
                  </p>
                </div>
              )}
              <table className="w-full text-[0.8rem]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(153,182,218,0.2)" }}>
                    {["Employee", "Regular Hours", "OT Hours", "PTO Hours", "Weeks"].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-5 py-3 text-[0.64rem] font-bold uppercase tracking-[0.1em]",
                          h !== "Employee" ? "text-right" : "text-left"
                        )}
                        style={{ color: "var(--sidebar-label)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHours.map((emp, i) => (
                    <tr
                      key={emp.employee_id}
                      style={{
                        borderBottom: i < filteredHours.length - 1 ? "1px solid rgba(153,182,218,0.12)" : "none",
                      }}
                    >
                      <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--sidebar-text)" }}>
                        {emp.full_name}
                        <span className="ml-2 text-[0.65rem] font-normal" style={{ color: "var(--sidebar-label)" }}>
                          {emp.employee_id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums" style={{ color: "var(--sidebar-text)" }}>
                        {emp.regular_hours.toFixed(1)}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right tabular-nums font-semibold"
                        style={{ color: emp.ot_hours > 0 ? "#d97706" : "var(--sidebar-label)" }}
                      >
                        {emp.ot_hours.toFixed(1)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums" style={{ color: "var(--sidebar-text)" }}>
                        {emp.pto_hours.toFixed(1)}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right tabular-nums text-[0.72rem]"
                        style={{
                          color: emp.weeks_included < (dashboard?.hours_week_count ?? 1)
                            ? "#d97706"
                            : "var(--sidebar-label)",
                        }}
                      >
                        {emp.weeks_included}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid rgba(153,182,218,0.25)", background: "rgba(153,182,218,0.06)" }}>
                    <td className="px-5 py-3 text-[0.72rem] font-bold" style={{ color: "var(--sidebar-label)" }}>Team Total</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalHours.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: totalOt > 0 ? "#d97706" : "var(--sidebar-text)" }}>{totalOt.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-[0.8rem] font-bold tabular-nums" style={{ color: "var(--sidebar-text)" }}>{totalPto.toFixed(1)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ── Reviews grid (upcoming + past due side by side) ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Upcoming */}
          <SectionCard title={`Upcoming Performance Reviews (${filteredUpcoming.length})`}>
            {!dashboard || dashboard.upcoming_reviews.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>
                  No upcoming reviews.
                </p>
              </div>
            ) : filteredUpcoming.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No employees match your search.</p>
              </div>
            ) : (
              <ul className="divide-y" style={{ "--tw-divide-opacity": 1, borderColor: "rgba(153,182,218,0.15)" } as React.CSSProperties}>
                {filteredUpcoming.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[0.82rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>
                        {r.full_name}
                      </p>
                      <p className="text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
                        {reviewTypeBadge(r.review_type)} · Due {formatDate(r.due_date)}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
                      style={{
                        background: `${daysUntilColor(r.days_until ?? 0)}18`,
                        color: daysUntilColor(r.days_until ?? 0),
                      }}
                    >
                      {r.days_until === 0 ? "Today" : `${r.days_until}d`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Past Due */}
          <SectionCard
            title={`Past Due Reviews (${filteredPastDue.length})`}
            accent={filteredPastDue.length > 0 ? "#dc2626" : undefined}
          >
            {!dashboard || dashboard.past_due_reviews.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>
                  No past due reviews.
                </p>
              </div>
            ) : filteredPastDue.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[0.8rem]" style={{ color: "var(--sidebar-label)" }}>No employees match your search.</p>
              </div>
            ) : (
              <ul className="divide-y" style={{ "--tw-divide-opacity": 1, borderColor: "rgba(153,182,218,0.15)" } as React.CSSProperties}>
                {filteredPastDue.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[0.82rem] font-semibold" style={{ color: "var(--sidebar-text)" }}>
                        {r.full_name}
                      </p>
                      <p className="text-[0.68rem]" style={{ color: "var(--sidebar-label)" }}>
                        {reviewTypeBadge(r.review_type)} · Was due {formatDate(r.due_date)}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-bold"
                      style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
                    >
                      {r.days_overdue}d overdue
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
        </>)}
      </div>
  );
}
