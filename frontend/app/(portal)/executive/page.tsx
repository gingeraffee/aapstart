"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import { executiveApi } from "@/lib/api";
import type { ExecutiveDashboardData, WoshReport, WoshReportMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

type MainTab = "wosh" | "org" | "hours";
type WoshSubTab = number; // sheet index 0, 1, or 2

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-[14px] px-5 py-4"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
        {label}
      </p>
      <p className="text-[1.6rem] font-bold leading-none" style={{ color: "var(--heading-color)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ThresholdBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn("rounded-[10px] px-3.5 py-3 text-center", color)}>
      <p className="text-[1.4rem] font-bold leading-none">{count}</p>
      <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

function SheetTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="py-8 text-center text-[0.8rem]" style={{ color: "var(--card-desc)" }}>
        No data in this sheet.
      </p>
    );
  }
  const headers = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto rounded-[12px]" style={{ border: "1px solid var(--card-border)" }}>
      <table className="w-full border-collapse text-[0.78rem]">
        <thead>
          <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-4 py-2.5 text-left font-semibold"
                style={{ color: "var(--module-context)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: i < data.length - 1 ? "1px solid var(--card-border)" : "none",
                background: i % 2 === 0 ? "transparent" : "var(--tab-group-bg)",
              }}
            >
              {headers.map((h) => (
                <td key={h} className="px-4 py-2 text-left" style={{ color: "var(--heading-color)" }}>
                  {row[h] == null ? "" : String(row[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WoshTab() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [weekLabel, setWeekLabel] = useState("");
  const [activeSheet, setActiveSheet] = useState<WoshSubTab>(0);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: latestReport, mutate: mutateLatest } = useSWR<WoshReport | null>(
    "wosh-latest",
    () => executiveApi.woshLatest()
  );
  const { data: history } = useSWR<WoshReportMeta[]>("wosh-history", () => executiveApi.woshHistory());
  const { data: selectedReport } = useSWR<WoshReport>(
    selectedHistoryId !== null ? `wosh-${selectedHistoryId}` : null,
    () => executiveApi.woshById(selectedHistoryId!)
  );

  const displayReport = selectedHistoryId !== null ? selectedReport : latestReport;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await executiveApi.uploadWosh(file, weekLabel);
      await mutateLatest();
      setWeekLabel("");
      setSelectedHistoryId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const sheets = displayReport?.sheets ?? [];

  return (
    <div className="space-y-5">
      {/* Upload card */}
      <div
        className="rounded-[16px] p-5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        <h3 className="mb-3 text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
          Upload WOSH Report
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-[0.72rem] font-semibold" style={{ color: "var(--module-context)" }}>
              Week Label (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Week of 05/19/2025"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-[0.8rem]"
              style={{
                background: "var(--login-input-bg)",
                border: "1px solid var(--login-input-border)",
                color: "var(--heading-color)",
                outline: "none",
              }}
            />
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              id="wosh-file-input"
            />
            <label
              htmlFor="wosh-file-input"
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-[10px] px-4 py-2 text-[0.8rem] font-semibold transition-all",
                uploading ? "cursor-not-allowed opacity-50" : "hover:opacity-90"
              )}
              style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 82%)", color: "#ffffff" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploading ? "Uploading…" : "Choose Excel File"}
            </label>
          </div>
        </div>
        {uploadError && (
          <p className="mt-2 text-[0.75rem] font-medium text-red-600">{uploadError}</p>
        )}
        {displayReport?.uploaded_at && (
          <p className="mt-2 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
            Showing:{" "}
            <span className="font-semibold">
              {displayReport.week_label ?? "Untitled report"}
            </span>{" "}
            — uploaded {new Date(displayReport.uploaded_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* History selector */}
      {history && history.length > 1 && (
        <div
          className="rounded-[14px] px-5 py-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wide" style={{ color: "var(--module-context)" }}>
            Previous Uploads
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedHistoryId(null)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all",
                selectedHistoryId === null
                  ? "text-white"
                  : "hover:opacity-80"
              )}
              style={{
                background: selectedHistoryId === null
                  ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 82%)"
                  : "var(--tab-group-bg)",
                border: "1px solid var(--tab-group-border)",
                color: selectedHistoryId === null ? "#ffffff" : "var(--tab-text)",
              }}
            >
              Latest
            </button>
            {history.slice(1).map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedHistoryId(r.id)}
                className={cn(
                  "rounded-[8px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all hover:opacity-80"
                )}
                style={{
                  background: selectedHistoryId === r.id
                    ? "linear-gradient(135deg, #1e3a5f 0%, #2563eb 82%)"
                    : "var(--tab-group-bg)",
                  border: "1px solid var(--tab-group-border)",
                  color: selectedHistoryId === r.id ? "#ffffff" : "var(--tab-text)",
                }}
              >
                {r.week_label ?? `Report #${r.id}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sheet tabs + data */}
      {sheets.length > 0 && (
        <div
          className="rounded-[16px]"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
        >
          {/* Sheet tab bar */}
          <div
            className="flex gap-1 border-b px-4 pt-3"
            style={{ borderColor: "var(--card-border)" }}
          >
            {sheets.map((sheet, idx) => (
              sheet.name && (
                <button
                  key={idx}
                  onClick={() => setActiveSheet(idx)}
                  className={cn(
                    "rounded-t-[8px] px-4 py-2 text-[0.8rem] font-semibold transition-all",
                    activeSheet === idx ? "" : "hover:opacity-70"
                  )}
                  style={{
                    background: activeSheet === idx ? "var(--sidebar-active-bg)" : "transparent",
                    border: activeSheet === idx ? "1px solid var(--card-border)" : "1px solid transparent",
                    borderBottom: activeSheet === idx ? "1px solid var(--card-bg)" : "1px solid transparent",
                    color: activeSheet === idx ? "var(--sidebar-text-active)" : "var(--module-context)",
                    marginBottom: activeSheet === idx ? "-1px" : "0",
                  }}
                >
                  {sheet.name}
                </button>
              )
            ))}
          </div>
          <div className="p-5">
            {sheets[activeSheet] ? (
              <SheetTable data={sheets[activeSheet].data as Record<string, unknown>[]} />
            ) : (
              <p className="py-8 text-center text-[0.8rem]" style={{ color: "var(--card-desc)" }}>
                Select a sheet above.
              </p>
            )}
          </div>
        </div>
      )}

      {!displayReport && (
        <div
          className="rounded-[16px] py-16 text-center"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--heading-color)" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="12" x2="12" y2="18" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>
            No WOSH report uploaded yet
          </p>
          <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>
            Upload an Excel workbook above to view the report.
          </p>
        </div>
      )}
    </div>
  );
}

function OrgTab({ data }: { data: ExecutiveDashboardData | undefined }) {
  if (!data) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const { headcount } = data;
  const TRACK_LABELS: Record<string, string> = {
    hr: "HR",
    warehouse: "Warehouse",
    administrative: "Administrative",
    management: "Management",
  };

  return (
    <div className="space-y-5">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Employees" value={headcount.total} />
        <KpiCard label="Managers" value={headcount.managers} />
        <KpiCard label="Executives" value={headcount.executives} />
        <KpiCard label="Admins" value={headcount.admins} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* By Department */}
        <div
          className="rounded-[16px] p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
        >
          <h3 className="mb-4 text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
            Headcount by Department
          </h3>
          {headcount.by_department.length === 0 ? (
            <p className="text-[0.8rem]" style={{ color: "var(--card-desc)" }}>No department data available.</p>
          ) : (
            <div className="space-y-2">
              {headcount.by_department.map((dept) => {
                const pct = Math.round((dept.count / headcount.total) * 100);
                return (
                  <div key={dept.department}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[0.8rem] font-medium" style={{ color: "var(--heading-color)" }}>
                        {dept.department}
                      </span>
                      <span className="text-[0.78rem] font-semibold" style={{ color: "var(--module-context)" }}>
                        {dept.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, #1e3a5f 0%, #2563eb 100%)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By Track */}
        <div
          className="rounded-[16px] p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
        >
          <h3 className="mb-4 text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
            Headcount by Track
          </h3>
          <div className="space-y-2">
            {Object.entries(headcount.by_track).map(([track, count]) => {
              const pct = Math.round((count / headcount.total) * 100);
              return (
                <div key={track}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[0.8rem] font-medium" style={{ color: "var(--heading-color)" }}>
                      {TRACK_LABELS[track] ?? track}
                    </span>
                    <span className="text-[0.78rem] font-semibold" style={{ color: "var(--module-context)" }}>
                      {count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--tab-group-bg)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, #134e26 0%, #16a34a 100%)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attendance thresholds */}
      <div
        className="rounded-[16px] p-5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        <h3 className="mb-4 text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
          Attendance Threshold Summary
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ThresholdBadge label="Verbal" count={data.attendance_thresholds.verbal} color="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-[10px]" />
          <ThresholdBadge label="Written" count={data.attendance_thresholds.written} color="bg-orange-50 text-orange-800 border border-orange-200 rounded-[10px]" />
          <ThresholdBadge label="Final" count={data.attendance_thresholds.final} color="bg-red-50 text-red-800 border border-red-200 rounded-[10px]" />
          <ThresholdBadge label="Termination" count={data.attendance_thresholds.termination} color="bg-red-100 text-red-900 border border-red-300 rounded-[10px]" />
        </div>
        <p className="mt-3 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
          Counts employees at or above each attendance point threshold across the entire organization.
        </p>
      </div>
    </div>
  );
}

function HoursTab({ data }: { data: ExecutiveDashboardData | undefined }) {
  if (!data) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const rows = data.hours_by_department;

  if (rows.length === 0) {
    return (
      <div
        className="rounded-[16px] py-16 text-center"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <p className="text-[0.85rem] font-semibold" style={{ color: "var(--heading-color)" }}>
          No hours data imported yet.
        </p>
        <p className="mt-1 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>
          Import time records via the Admin panel to see department-level hours.
        </p>
      </div>
    );
  }

  const totalReg = rows.reduce((s, r) => s + r.regular_hours, 0);
  const totalOt = rows.reduce((s, r) => s + r.ot_hours, 0);
  const totalEmp = rows.reduce((s, r) => s + r.employee_count, 0);

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Employees with Hours" value={totalEmp} />
        <KpiCard
          label="Total Regular Hours"
          value={fmt(totalReg)}
          sub={data.hours_date_range ?? undefined}
        />
        <KpiCard label="Total OT Hours" value={fmt(totalOt)} sub={`${((totalOt / (totalReg + totalOt || 1)) * 100).toFixed(1)}% of total`} />
      </div>

      {/* Department table */}
      <div
        className="rounded-[16px] overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
          <h3 className="text-[0.9rem] font-bold" style={{ color: "var(--heading-color)" }}>
            Hours & OT by Department
          </h3>
          {data.hours_date_range && (
            <p className="mt-0.5 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
              Period: {data.hours_date_range}
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.8rem]">
            <thead>
              <tr style={{ background: "var(--tab-group-bg)", borderBottom: "1px solid var(--card-border)" }}>
                {["Department", "Employees", "Regular Hrs", "OT Hrs", "OT %", "Vacation", "Personal", "Absent (w/pt)", "Protected"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--module-context)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const otPct = row.regular_hours + row.ot_hours > 0
                  ? ((row.ot_hours / (row.regular_hours + row.ot_hours)) * 100).toFixed(1)
                  : "0.0";
                return (
                  <tr
                    key={row.department}
                    style={{
                      borderBottom: i < rows.length - 1 ? "1px solid var(--card-border)" : "none",
                      background: i % 2 === 0 ? "transparent" : "var(--tab-group-bg)",
                    }}
                  >
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--heading-color)" }}>{row.department}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--heading-color)" }}>{row.employee_count}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--heading-color)" }}>{fmt(row.regular_hours)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: row.ot_hours > 0 ? "#b45309" : "var(--heading-color)" }}>
                      {fmt(row.ot_hours)}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--module-context)" }}>{otPct}%</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--heading-color)" }}>{fmt(row.vacation_hours)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--heading-color)" }}>{fmt(row.personal_hours)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: row.absent_w_point_hours > 0 ? "#b91c1c" : "var(--heading-color)" }}>
                      {fmt(row.absent_w_point_hours)}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--heading-color)" }}>{fmt(row.protected_hours)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--card-border)", background: "var(--tab-group-bg)" }}>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--heading-color)" }}>Total</td>
                <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--heading-color)" }}>{totalEmp}</td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--heading-color)" }}>{fmt(totalReg)}</td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--heading-color)" }}>{fmt(totalOt)}</td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--module-context)" }}>
                  {((totalOt / (totalReg + totalOt || 1)) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--heading-color)" }}>
                  {fmt(rows.reduce((s, r) => s + r.vacation_hours, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--heading-color)" }}>
                  {fmt(rows.reduce((s, r) => s + r.personal_hours, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--heading-color)" }}>
                  {fmt(rows.reduce((s, r) => s + r.absent_w_point_hours, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--heading-color)" }}>
                  {fmt(rows.reduce((s, r) => s + r.protected_hours, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ExecutivePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>("wosh");

  const { data: dashboardData } = useSWR<ExecutiveDashboardData>(
    "executive-dashboard",
    () => executiveApi.dashboard()
  );

  // Redirect non-executives who aren't admins
  if (user && !user.is_executive && !user.is_admin) {
    router.replace("/overview");
    return null;
  }

  const tabs: { id: MainTab; label: string }[] = [
    { id: "wosh", label: "WOSH Report" },
    { id: "org", label: "Org Summary" },
    { id: "hours", label: "Hours & OT" },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[1.55rem] font-bold leading-tight" style={{ color: "var(--heading-color)" }}>
          Executive Dashboard
        </h1>
        <p className="mt-1 text-[0.83rem]" style={{ color: "var(--card-desc)" }}>
          Organization-wide reports and metrics
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="mb-6 flex gap-1 rounded-[12px] p-1"
        style={{ background: "var(--tab-group-bg)", border: "1px solid var(--tab-group-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-[9px] py-2 text-[0.82rem] font-semibold transition-all duration-150"
            )}
            style={{
              background: activeTab === tab.id ? "var(--card-bg)" : "transparent",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(12,24,47,0.10)" : "none",
              color: activeTab === tab.id ? "var(--heading-color)" : "var(--tab-text)",
              border: activeTab === tab.id ? "1px solid var(--card-border)" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "wosh" && <WoshTab />}
      {activeTab === "org" && <OrgTab data={dashboardData} />}
      {activeTab === "hours" && <HoursTab data={dashboardData} />}
    </div>
  );
}
