"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { adminApi, managerApi, modulesApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { EmployeeImportResult, EmployeeImportRowInput, EmployeeRecord, ImportResult, ModuleSummary, NoteRecord } from "@/lib/types";

const TRACKS = ["hr", "warehouse", "administrative", "management"] as const;
const TRACK_LABELS: Record<string, string> = {
  hr: "HR",
  warehouse: "Warehouse",
  administrative: "Administrative",
  management: "Management",
};

type ParsedImportRow = {
  row: number;
  name: string;
  employee_id: string;
  track: string;
  is_admin: boolean;
  department: string;
  manager_employee_id: string;
  error?: string;
};

type ToastState = {
  message: string;
  tone?: "success" | "error";
};

const IMPORT_TEMPLATE = `name,employee_id,track,is_admin,department,manager_employee_id
Jane Doe,EMP-100,hr,false,Inside Sales,EMP-050
Marcus Lane,EMP-101,warehouse,false,,
Olivia Grant,EMP-102,administrative,true,Compliance,
Alex Kim,EMP-103,hr|warehouse,false,,
`;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
  }

  return rows;
}

function coerceBoolean(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "y" || normalized === "1";
}

function parseImportFile(text: string): { rows: ParsedImportRow[]; fileError?: string } {
  const csvRows = parseCsv(text);
  if (csvRows.length < 2) {
    return { rows: [], fileError: "Upload a CSV with a header row and at least one employee." };
  }

  const headers = csvRows[0].map(normalizeHeader);
  const nameIndex = headers.findIndex((header) => header === "name" || header === "full_name");
  const employeeIdIndex = headers.indexOf("employee_id");
  const trackIndex = headers.indexOf("track");
  const isAdminIndex = headers.indexOf("is_admin");
  const deptIndex = headers.findIndex((h) => h === "department" || h === "dept");
  const managerIndex = headers.findIndex((h) => h === "manager_employee_id" || h === "manager_id" || h === "reports_to");

  if (nameIndex === -1 || employeeIdIndex === -1 || trackIndex === -1) {
    return { rows: [], fileError: "Template columns must include name, employee_id, and track." };
  }

  return {
    rows: csvRows.slice(1).map((row, index) => {
      const name = row[nameIndex]?.trim() ?? "";
      const employee_id = row[employeeIdIndex]?.trim() ?? "";
      const track = row[trackIndex]?.trim().toLowerCase() ?? "";
      const is_admin = coerceBoolean(row[isAdminIndex]);
      const department = deptIndex >= 0 ? (row[deptIndex]?.trim() ?? "") : "";
      const manager_employee_id = managerIndex >= 0 ? (row[managerIndex]?.trim() ?? "") : "";

      let error: string | undefined;
      if (!name) error = "Name is required.";
      else if (!employee_id) error = "Employee number is required.";
      else if (!track) error = "Track is required.";
      else if (!track.split(/[|,]/).map((t) => t.trim()).some((t) => TRACKS.includes(t as (typeof TRACKS)[number]))) error = `Track must include at least one of: ${TRACKS.join(", ")}.`;
      else if (name.trim().split(/\s+/).length < 2) error = "Name must include first and last name.";

      return { row: index + 2, name, employee_id, track, is_admin, department, manager_employee_id, error };
    }),
  };
}

function downloadImportTemplate() {
  const blob = new Blob([IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aap-start-employee-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function getMostRecentMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diff);
  return mon.toISOString().split("T")[0];
}

function downloadHoursTemplate() {
  const monday = getMostRecentMonday();
  const csv = [
    // week_start is optional — use a specific date for historical imports, omit for "upload date"
    "employee_name,employee_id,week_start,regular_hours,ot_hours,vacation_hours,personal_hours,other_hours",
    `Jane Doe,EMP-100,${monday},40,2.5,8,0,0`,
    `Marcus Lane,EMP-101,${monday},35,0,0,4,0`,
    `Olivia Grant,EMP-102,${monday},40,5,0,0,2`,
    "",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hours-upload-${monday}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadReviewsTemplate() {
  const csv = [
    "employee_id,review_type,due_date,completed,completed_date",
    "EMP-100,Annual Review,2026-06-15,false,",
    "EMP-101,90-Day Review,2026-05-30,true,2026-05-28",
    "EMP-102,6-Month Review,2026-07-01,false,",
    "",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reviews-upload-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function cardStyle() {
  return {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    boxShadow: "0 18px 36px rgba(17, 41, 74, 0.12)",
  } as const;
}

function AddEmployeeForm({ onAdded, departments, allEmployees }: { onAdded: (message: string) => void; departments: string[]; allEmployees: EmployeeRecord[] }) {
  const [form, setForm] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    tracks: ["hr"] as string[],
    is_admin: false,
    department: "",
    manager_employee_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminApi.createEmployee({ ...form, department: form.department.trim() || null, manager_employee_id: form.manager_employee_id || null });
      setForm({ employee_id: "", first_name: "", last_name: "", tracks: ["hr"], is_admin: false, department: "", manager_employee_id: "" });
      onAdded("Changes saved. Employee added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-[24px] p-6 lg:p-7" style={cardStyle()}>
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_62%,#df0030_100%)]" />
      <p className="inline-flex rounded-full px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
        Add Employee
      </p>
      <h2 className="mt-3 text-[1.14rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
        Add someone one by one
      </h2>
      <p className="mt-1 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
        Best for a same-day hire, a correction, or a quick admin access change.
      </p>

      {error && (
        <div className="mt-5 rounded-[14px] px-4 py-3 text-[0.8rem]" style={{ background: "rgba(223,0,48,0.08)", border: "1px solid rgba(223,0,48,0.16)", color: "#9f1239" }}>
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["First Name", "first_name"],
          ["Last Name", "last_name"],
          ["Employee Number", "employee_id"],
        ].map(([label, key]) => (
          <div key={key}>
            <label className="mb-1.5 block text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
              {label}
            </label>
            <input
              required
              value={form[key as "first_name" | "last_name" | "employee_id"]}
              onChange={(event) => update(key as "first_name" | "last_name" | "employee_id", event.target.value)}
              className="w-full rounded-[14px] px-3.5 py-2.5 text-[0.84rem] font-medium outline-none transition-all"
              style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
            Track(s)
          </label>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-[14px] px-3.5 py-2.5" style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)" }}>
            {TRACKS.map((track) => (
              <label key={track} className="flex items-center gap-2 text-[0.82rem] font-medium cursor-pointer" style={{ color: "var(--heading-color)" }}>
                <input
                  type="checkbox"
                  checked={form.tracks.includes(track)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...form.tracks, track]
                      : form.tracks.filter((t) => t !== track);
                    update("tracks", next);
                  }}
                  className="rounded"
                />
                {TRACK_LABELS[track]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
          Department <span className="font-normal normal-case tracking-normal" style={{ color: "var(--card-desc)" }}>(optional)</span>
        </label>
        <input
          list="dept-list-add"
          value={form.department}
          onChange={(e) => update("department", e.target.value)}
          placeholder="e.g. Inside Sales, Compliance…"
          className="w-full rounded-[14px] px-3.5 py-2.5 text-[0.84rem] font-medium outline-none transition-all"
          style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
        />
        <datalist id="dept-list-add">
          {departments.map((d) => <option key={d} value={d} />)}
        </datalist>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
          Reports To <span className="font-normal normal-case tracking-normal" style={{ color: "var(--card-desc)" }}>(optional)</span>
        </label>
        <select
          value={form.manager_employee_id}
          onChange={(e) => update("manager_employee_id", e.target.value)}
          className="w-full rounded-[14px] px-3.5 py-2.5 text-[0.84rem] font-medium outline-none transition-all"
          style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
        >
          <option value="">No manager assigned</option>
          {allEmployees
            .filter((e) => e.is_manager)
            .sort((a, b) => a.last_name.localeCompare(b.last_name))
            .map((m) => (
              <option key={m.employee_id} value={m.employee_id}>{m.full_name}</option>
            ))}
        </select>
      </div>

      <label className="mt-4 flex items-center gap-2.5 text-[0.8rem] font-medium" style={{ color: "var(--welcome-label-text)" }}>
        <input type="checkbox" checked={form.is_admin} onChange={(event) => update("is_admin", event.target.checked)} className="h-4 w-4 rounded border" />
        Give this employee admin access
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex items-center rounded-[14px] px-5 py-2.5 text-[0.82rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)" }}
      >
        {loading ? "Adding..." : "Add Employee"}
      </button>
    </form>
  );
}

interface ModuleProgress {
  module_slug: string;
  visited: boolean;
  visited_at: string | null;
  acknowledgements_completed: boolean;
  quiz_passed: boolean;
  quiz_score: number | null;
  quiz_attempts: number;
  module_completed: boolean;
  completed_at: string | null;
}

function EmployeeRow({ emp, currentUserId, modules, allEmployees, onDeleted }: { emp: EmployeeRecord; currentUserId: string; modules: ModuleSummary[]; allEmployees: EmployeeRecord[]; onDeleted: (message: string, tone?: "success" | "error") => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTracks, setEditTracks] = useState<string[]>(emp.tracks ?? ["hr"]);
  const [editAdmin, setEditAdmin] = useState(emp.is_admin);
  const [editIsManager, setEditIsManager] = useState(emp.is_manager ?? false);
  const [editManagerEmployeeId, setEditManagerEmployeeId] = useState(emp.manager_employee_id ?? "");
  const [editDepartment, setEditDepartment] = useState(emp.department ?? "");
  const existingDepartments = [...new Set(allEmployees.map((e) => e.department).filter(Boolean) as string[])].sort();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resettingTotp, setResettingTotp] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[] | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [employeeNotes, setEmployeeNotes] = useState<NoteRecord[] | null>(null);
  const isSelf = emp.employee_id === currentUserId;
  const lastLogin = emp.last_login_at
    ? new Date(emp.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Not yet";

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!moduleProgress) {
      setLoadingProgress(true);
      try {
        const [progressData, notesData] = await Promise.all([
          adminApi.employeeProgress(emp.employee_id) as Promise<ModuleProgress[]>,
          adminApi.employeeNotes(emp.employee_id) as Promise<NoteRecord[]>,
        ]);
        setModuleProgress(progressData);
        setEmployeeNotes(notesData);
      } catch {
        setModuleProgress([]);
        setEmployeeNotes([]);
      } finally {
        setLoadingProgress(false);
      }
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await adminApi.deleteEmployee(emp.employee_id);
      setConfirmingDelete(false);
      onDeleted("Changes saved. Employee removed.");
    } catch (err) {
      onDeleted(err instanceof Error ? err.message : "Failed to delete.", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await adminApi.updateEmployee(emp.employee_id, {
        tracks: editTracks,
        is_admin: editAdmin,
        is_manager: editIsManager,
        manager_employee_id: editManagerEmployeeId || null,
        department: editDepartment.trim() || null,
      });
      setEditing(false);
      const trackLabel = editTracks.map((t) => TRACK_LABELS[t] ?? t).join(", ");
      onDeleted(`Updated ${emp.full_name} - track: ${trackLabel}${editAdmin ? " (Admin)" : ""}${editIsManager ? " (Manager)" : ""}.`);
    } catch (err) {
      onDeleted(err instanceof Error ? err.message : "Failed to update.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetProgress() {
    setResetting(true);
    try {
      await adminApi.resetProgress(emp.employee_id);
      setConfirmingReset(false);
      onDeleted(`Progress reset for ${emp.full_name}.`);
    } catch (err) {
      onDeleted(err instanceof Error ? err.message : "Failed to reset progress.", "error");
    } finally {
      setResetting(false);
    }
  }

  async function handleResetTotp() {
    setResettingTotp(true);
    try {
      await adminApi.resetTotp(emp.employee_id);
      onDeleted(`Two-factor authentication reset for ${emp.full_name}.`);
    } catch (err) {
      onDeleted(err instanceof Error ? err.message : "Failed to reset 2FA.", "error");
    } finally {
      setResettingTotp(false);
    }
  }

  return (
    <>
    <tr className={cn("border-b border-slate-100 last:border-0", expanded && "border-b-0")}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpand}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all hover:bg-slate-100"
            title={expanded ? "Collapse" : "View module progress"}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("transition-transform duration-200", expanded && "rotate-90")}
              style={{ color: "var(--card-desc)" }}
            >
              <path d="M3 1.5L7 5L3 8.5" />
            </svg>
          </button>
          <div>
            <p className="text-[0.86rem] font-semibold leading-tight" style={{ color: "var(--heading-color)" }}>{emp.full_name}</p>
            <p className="mt-0.5 text-[0.72rem]" style={{ color: "var(--module-context)" }}>{emp.employee_id}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              {Object.entries(TRACK_LABELS).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
                  <input
                    type="checkbox"
                    checked={editTracks.includes(val)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditTracks((prev) => [...prev, val]);
                      } else {
                        setEditTracks((prev) => prev.filter((t) => t !== val));
                      }
                    }}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
              <input
                type="checkbox"
                checked={editAdmin}
                onChange={(e) => setEditAdmin(e.target.checked)}
                className="rounded"
              />
              Admin
            </label>
            <label className="flex items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
              <input
                type="checkbox"
                checked={editIsManager}
                onChange={(e) => setEditIsManager(e.target.checked)}
                className="rounded"
              />
              Manager
            </label>
            <div className="mt-1.5">
              <p className="mb-1 text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Department</p>
              <input
                list={`dept-list-${emp.employee_id}`}
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="e.g. Inside Sales…"
                className="w-full rounded-[10px] px-2.5 py-1.5 text-[0.74rem]"
                style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
              />
              <datalist id={`dept-list-${emp.employee_id}`}>
                {existingDepartments.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>
            <div className="mt-1.5">
              <p className="mb-1 text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Reports To</p>
              <select
                value={editManagerEmployeeId}
                onChange={(e) => setEditManagerEmployeeId(e.target.value)}
                className="w-full rounded-[10px] px-2.5 py-1.5 text-[0.74rem]"
                style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
              >
                <option value="">No manager assigned</option>
                {allEmployees
                  .filter((e) => e.is_manager && e.employee_id !== emp.employee_id)
                  .sort((a, b) => a.last_name.localeCompare(b.last_name))
                  .map((m) => (
                    <option key={m.employee_id} value={m.employee_id}>{m.full_name}</option>
                  ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {(emp.tracks ?? []).map((t) => (
                <span
                  key={t}
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold",
                    t === "hr"
                      ? "bg-blue-50 text-blue-700"
                      : t === "warehouse"
                        ? "bg-amber-50 text-amber-700"
                        : t === "management"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-fuchsia-50 text-fuchsia-700"
                  )}
                >
                  {TRACK_LABELS[t] ?? t}
                </span>
              ))}
            </div>
            {emp.is_admin && <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600">Admin</span>}
            {emp.is_manager && <span className="mt-1 ml-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-700">Manager</span>}
            {emp.totp_enabled && <span className="mt-1 ml-1 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[0.68rem] font-semibold text-purple-700">2FA</span>}
            {emp.department && (
              <p className="mt-1 text-[0.67rem] font-medium" style={{ color: "var(--module-context)" }}>
                {emp.department}
              </p>
            )}
            {emp.manager_employee_id && (
              <p className="mt-0.5 text-[0.67rem]" style={{ color: "var(--module-context)" }}>
                Reports to: {allEmployees.find((e) => e.employee_id === emp.manager_employee_id)?.full_name ?? emp.manager_employee_id}
              </p>
            )}
          </>
        )}
      </td>
      <td className="px-6 py-4">
        <p className="text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>{emp.progress.modules_completed} completed</p>
        <p className="text-[0.7rem]" style={{ color: "var(--module-context)" }}>{emp.progress.total_modules_seen} touched</p>
      </td>
      <td className="px-6 py-4 text-[0.78rem]" style={{ color: "var(--card-desc)" }}>{lastLogin}</td>
      <td className="px-6 py-4 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setEditing(false); setEditTracks(emp.tracks ?? ["hr"]); setEditAdmin(emp.is_admin); setEditIsManager(emp.is_manager ?? false); setEditManagerEmployeeId(emp.manager_employee_id ?? ""); setEditDepartment(emp.department ?? ""); }}
              disabled={saving}
              className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: "var(--card-desc)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : confirmingDelete ? (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: "var(--card-desc)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #b91c1c 0%, #df0030 100%)" }}
              >
                {deleting ? "Removing..." : "Confirm"}
              </button>
            </div>
        ) : confirmingReset ? (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmingReset(false)}
                disabled={resetting}
                className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: "var(--card-desc)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetProgress}
                disabled={resetting}
                className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)" }}
              >
                {resetting ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: "#0369a1" }}
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmingReset(true)}
              className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ color: "#b45309" }}
            >
              Reset
            </button>
            {emp.totp_enabled && (
              <button
                onClick={handleResetTotp}
                disabled={resettingTotp}
                className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: "#7c3aed" }}
              >
                {resettingTotp ? "Resetting..." : "Reset 2FA"}
              </button>
            )}
            {!isSelf && (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={deleting}
                className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: "#be123c" }}
              >
                Remove
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
    {expanded && (
      <tr className="border-b border-slate-100">
        <td colSpan={5} className="px-6 pb-4 pt-0">
          <div className="space-y-3">
          <div
            className="rounded-[14px] p-4"
            style={{ background: "rgba(241, 245, 249, 0.6)", border: "1px solid rgba(153,182,218,0.25)" }}
          >
            <p className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
              Module Progress
            </p>
            {loadingProgress ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner />
                <span className="text-[0.76rem]" style={{ color: "var(--card-desc)" }}>Loading...</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {modules
                  .filter((m) => m.status === "published")
                  .sort((a, b) => a.order - b.order)
                  .map((m) => {
                    const prog = moduleProgress?.find((p) => p.module_slug === m.slug);
                    const isCompleted = prog?.module_completed ?? false;
                    const isVisited = prog?.visited ?? false;
                    const completedDate = prog?.completed_at
                      ? new Date(prog.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : null;
                    return (
                      <div
                        key={m.slug}
                        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2"
                        style={{
                          background: isCompleted ? "rgba(22, 163, 74, 0.06)" : isVisited ? "rgba(255,255,255,0.7)" : "transparent",
                          border: isCompleted ? "1px solid rgba(22, 163, 74, 0.15)" : "1px solid transparent",
                        }}
                      >
                        {/* Status icon */}
                        <span
                          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: isCompleted ? "rgba(22, 163, 74, 0.12)" : isVisited ? "rgba(14, 165, 233, 0.1)" : "rgba(148, 163, 184, 0.15)",
                          }}
                        >
                          {isCompleted ? (
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 5.5l2 2L8 2.5" />
                            </svg>
                          ) : isVisited ? (
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="5" cy="5" r="2" />
                            </svg>
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(148, 163, 184, 0.5)" }} />
                          )}
                        </span>

                        {/* Module title */}
                        <span
                          className="flex-1 text-[0.76rem] font-medium leading-tight"
                          style={{ color: isCompleted ? "#15803d" : isVisited ? "var(--heading-color)" : "var(--card-desc)" }}
                        >
                          {m.title}
                        </span>

                        {/* Status label */}
                        {isCompleted && completedDate ? (
                          <span className="text-[0.64rem] font-medium" style={{ color: "#16a34a" }}>{completedDate}</span>
                        ) : isVisited ? (
                          <span className="text-[0.64rem] font-medium" style={{ color: "#0ea5e9" }}>In progress</span>
                        ) : (
                          <span className="text-[0.64rem] font-medium" style={{ color: "rgba(148, 163, 184, 0.8)" }}>Not started</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Notes panel - only shown when there are notes */}
          {!loadingProgress && employeeNotes && employeeNotes.length > 0 && (
            <div
              className="rounded-[14px] p-4"
              style={{ background: "rgba(241, 245, 249, 0.6)", border: "1px solid rgba(153,182,218,0.25)" }}
            >
              <p className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
                Module Notes
              </p>
              <div className="space-y-2">
                {employeeNotes.map((note) => {
                  const moduleTitle = modules.find((m) => m.slug === note.module_slug)?.title ?? note.module_title ?? note.module_slug;
                  const updatedDate = note.updated_at
                    ? new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : null;
                  return (
                    <div
                      key={note.id}
                      className="rounded-[10px] px-3 py-2.5"
                      style={{ background: "rgba(14,118,189,0.05)", border: "1px solid rgba(14,118,189,0.12)" }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-[0.72rem] font-semibold leading-tight" style={{ color: "var(--heading-color)" }}>
                          {moduleTitle}
                        </p>
                        {updatedDate && (
                          <span className="shrink-0 text-[0.64rem]" style={{ color: "var(--module-context)" }}>
                            {updatedDate}
                          </span>
                        )}
                      </div>
                      {note.selected_text && (
                        <div className="mb-1.5 rounded-[8px] px-2.5 py-2" style={{ background: "rgba(14,118,189,0.08)", border: "1px solid rgba(14,118,189,0.18)" }}>
                          <p className="text-[0.68rem] italic leading-[1.45]" style={{ color: "#335174" }}>
                            "{note.selected_text}"
                          </p>
                          {note.anchor_id && (
                            <a
                              href={`/modules/${note.module_slug}#${encodeURIComponent(note.anchor_id)}`}
                              className="mt-1 inline-block text-[0.66rem] font-semibold"
                              style={{ color: "#0f7fb3" }}
                            >
                              Jump to section
                            </a>
                          )}
                        </div>
                      )}
                      <p
                        className="text-[0.76rem] leading-[1.55] whitespace-pre-wrap"
                        style={{ color: "var(--card-desc)" }}
                      >
                        {note.note_text}
                      </p>
                      {note.admin_reply && (
                        <div className="mt-1.5 rounded-[8px] px-2.5 py-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#15803d" }}>
                            Admin Reply
                          </p>
                          <p className="mt-1 text-[0.72rem] leading-[1.45]" style={{ color: "#1f5135" }}>
                            {note.admin_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </td>
      </tr>
    )}
    </>
  );
}

function ImportEmployeesModal({ onClose, onImported }: { onClose: () => void; onImported: (result: EmployeeImportResult) => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<EmployeeImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const readyRows = rows.filter((row) => !row.error);
  const flaggedRows = rows.filter((row) => row.error);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);

    if (!file) {
      setFileName(null);
      setRows([]);
      setFileError(null);
      return;
    }

    setFileName(file.name);
    const parsed = parseImportFile(await file.text());
    setRows(parsed.rows);
    setFileError(parsed.fileError ?? null);
  }

  async function handleImport() {
    if (readyRows.length === 0) return;

    setImporting(true);
    setFileError(null);
    try {
      const payload: EmployeeImportRowInput[] = readyRows.map((row) => ({
        name: row.name,
        employee_id: row.employee_id,
        track: row.track,
        is_admin: row.is_admin,
        department: row.department || undefined,
        manager_employee_id: row.manager_employee_id || undefined,
      }));
      const importResult = (await adminApi.importEmployees(payload)) as EmployeeImportResult;
      setResult(importResult);
      onImported(importResult);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,18,37,0.54)] px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "0 32px 60px rgba(7,18,37,0.28)" }}>
        <div className="h-[4px] w-full bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_52%,#df0030_100%)]" />
        <div className="p-6 lg:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
                Import Employees
              </p>
              <h2 className="mt-3 text-[1.24rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
                Add a batch in one upload
              </h2>
              <p className="mt-1 text-[0.84rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                Upload a CSV exported from Excel with employee name, employee number, and track.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-black/5" aria-label="Close import modal">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10" /></svg>
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.08fr,0.92fr]">
            <div className="rounded-[20px] border p-5" style={{ background: "var(--welcome-stat-bg)", borderColor: "var(--welcome-stat-border)" }}>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Upload</p>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed px-5 py-10 text-center transition-all hover:-translate-y-px" style={{ borderColor: "rgba(14,165,233,0.35)", background: "rgba(14,165,233,0.05)" }}>
                <span className="text-[0.86rem] font-semibold" style={{ color: "var(--heading-color)" }}>{fileName ?? "Choose a CSV file"}</span>
                <span className="mt-1 text-[0.76rem]" style={{ color: "var(--card-desc)" }}>Use the template if you want a clean starting point.</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={downloadImportTemplate} className="rounded-[12px] px-4 py-2 text-[0.76rem] font-semibold transition-all hover:-translate-y-px" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}>
                  Download Template
                </button>
                <div className="rounded-[12px] px-4 py-2 text-[0.74rem] font-medium" style={{ background: "rgba(27,44,86,0.06)", color: "var(--welcome-label-text)" }}>
                  Required: name, employee_id, track · Optional: department, manager_employee_id
                </div>
              </div>

              {fileError && (
                <div className="mt-4 rounded-[14px] px-4 py-3 text-[0.8rem]" style={{ background: "rgba(223,0,48,0.08)", border: "1px solid rgba(223,0,48,0.16)", color: "#9f1239" }}>
                  {fileError}
                </div>
              )}
            </div>

            <div className="rounded-[20px] border p-5" style={{ background: "var(--welcome-stat-bg)", borderColor: "var(--welcome-stat-border)" }}>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Validation Preview</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] px-4 py-3" style={{ background: "rgba(14,165,233,0.06)" }}>
                  <p className="text-[1.5rem] font-extrabold" style={{ color: "var(--heading-color)" }}>{readyRows.length}</p>
                  <p className="text-[0.74rem] font-medium" style={{ color: "var(--card-desc)" }}>Ready to import</p>
                </div>
                <div className="rounded-[16px] px-4 py-3" style={{ background: "rgba(223,0,48,0.06)" }}>
                  <p className="text-[1.5rem] font-extrabold" style={{ color: "var(--heading-color)" }}>{flaggedRows.length}</p>
                  <p className="text-[0.74rem] font-medium" style={{ color: "var(--card-desc)" }}>Need review</p>
                </div>
              </div>

              <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                {rows.length === 0 ? (
                  <p className="text-[0.8rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>Your preview will appear here after upload.</p>
                ) : (
                  rows.slice(0, 8).map((row) => (
                    <div key={`${row.row}-${row.employee_id}`} className="rounded-[14px] border px-3.5 py-3" style={{ background: row.error ? "rgba(223,0,48,0.04)" : "rgba(14,165,233,0.04)", borderColor: row.error ? "rgba(223,0,48,0.16)" : "rgba(14,165,233,0.12)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[0.8rem] font-semibold" style={{ color: "var(--heading-color)" }}>{row.name || "Unnamed employee"}</p>
                        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--module-context)" }}>Row {row.row}</span>
                      </div>
                      <p className="mt-1 text-[0.74rem]" style={{ color: "var(--card-desc)" }}>
                        {row.employee_id || "Missing employee number"} · {row.track.split(/[|,]/).map((t) => TRACK_LABELS[t.trim()] ?? t.trim()).join(", ")}
                        {row.is_admin ? " · Admin" : ""}
                        {row.department ? ` · ${row.department}` : ""}
                        {row.manager_employee_id ? ` · Reports to ${row.manager_employee_id}` : ""}
                      </p>
                      {row.error && <p className="mt-1.5 text-[0.74rem] font-medium" style={{ color: "#9f1239" }}>{row.error}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {result && (
            <div className="mt-5 rounded-[18px] border px-5 py-4" style={{ background: "rgba(17,41,74,0.04)", borderColor: "rgba(17,41,74,0.1)" }}>
              <p className="text-[0.9rem] font-semibold" style={{ color: "var(--heading-color)" }}>{result.added} imported, {result.skipped} skipped</p>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.errors.slice(0, 5).map((error) => (
                    <p key={`${error.row}-${error.employee_id ?? "missing"}`} className="text-[0.76rem]" style={{ color: "var(--card-desc)" }}>
                      Row {error.row}: {error.detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-[12px] px-4 py-2 text-[0.78rem] font-semibold transition-all hover:-translate-y-px" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}>
              Close
            </button>
            <button type="button" onClick={handleImport} disabled={readyRows.length === 0 || importing} className="rounded-[12px] px-4 py-2 text-[0.78rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60" style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)" }}>
              {importing ? "Importing..." : `Import ${readyRows.length || ""}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadPanel({
  title,
  columns,
  onDownload,
  file,
  onFileChange,
  onUpload,
  loading,
  result,
  error,
  onClear,
}: {
  title: string;
  columns: string;
  onDownload: () => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onUpload: () => void;
  loading: boolean;
  result: ImportResult | null;
  error: string | null;
  onClear?: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border p-5" style={{ background: "var(--welcome-stat-bg)", borderColor: "var(--welcome-stat-border)" }}>
      <div>
        <p className="text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{title}</p>
        <p className="mt-0.5 font-mono text-[0.66rem]" style={{ color: "var(--module-context)" }}>{columns}</p>
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="self-start rounded-[12px] px-3.5 py-2 text-[0.75rem] font-semibold transition-all hover:-translate-y-px"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
      >
        Download Template
      </button>

      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed px-4 py-6 text-center transition-all hover:-translate-y-px"
        style={{ borderColor: "rgba(14,165,233,0.35)", background: "rgba(14,165,233,0.04)" }}
      >
        <span className="text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>
          {file ? file.name : "Choose a CSV file"}
        </span>
        <span className="mt-0.5 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
          {file ? `${(file.size / 1024).toFixed(1)} KB` : "Click to browse"}
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </label>

      {file && (
        <button
          type="button"
          onClick={onUpload}
          disabled={loading}
          className="rounded-[12px] px-4 py-2.5 text-[0.78rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)" }}
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      )}

      {result && (
        <div
          className="rounded-[14px] px-4 py-3"
          style={{
            background: result.skipped > 0 ? "rgba(223,0,48,0.05)" : "rgba(14,165,233,0.06)",
            border: `1px solid ${result.skipped > 0 ? "rgba(223,0,48,0.18)" : "rgba(14,165,233,0.14)"}`,
          }}
        >
          <p className="text-[0.8rem] font-semibold" style={{ color: "var(--heading-color)" }}>
            {result.inserted} updated{result.skipped > 0 ? `, ${result.skipped} skipped` : ""}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {result.errors.slice(0, 5).map((e, idx) => (
                <li key={idx} className="text-[0.71rem] leading-snug" style={{ color: "#9f1239" }}>
                  Row {e.row}{e.employee_id ? ` (${e.employee_id})` : ""}: {e.detail}
                </li>
              ))}
              {result.errors.length > 5 && (
                <li className="text-[0.71rem]" style={{ color: "var(--card-desc)" }}>
                  …and {result.errors.length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-[14px] px-4 py-3 text-[0.78rem]" style={{ background: "rgba(223,0,48,0.06)", border: "1px solid rgba(223,0,48,0.14)", color: "#9f1239" }}>
          {error}
        </div>
      )}

      {onClear && (
        confirming ? (
          <div className="flex items-center gap-2 pt-1">
            <span className="flex-1 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>Remove all uploaded records?</span>
            <button onClick={() => setConfirming(false)} disabled={clearing} className="rounded-[8px] px-2.5 py-1 text-[0.7rem] font-semibold transition-all hover:bg-black/5" style={{ color: "var(--card-desc)" }}>Cancel</button>
            <button
              onClick={async () => { setClearing(true); await onClear(); setConfirming(false); setClearing(false); }}
              disabled={clearing}
              className="rounded-[8px] px-2.5 py-1 text-[0.7rem] font-semibold"
              style={{ background: "rgba(223,0,48,0.08)", color: "#9f1239" }}
            >
              {clearing ? "Clearing…" : "Yes, clear all"}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="self-start text-[0.7rem] font-medium transition-all hover:opacity-60" style={{ color: "var(--card-desc)" }}>
            Clear all records
          </button>
        )
      )}
    </div>
  );
}

function WeeklyUploadCard({ onToast }: { onToast: (msg: string, tone?: "success" | "error") => void }) {
  const [hoursFile, setHoursFile] = useState<File | null>(null);
  const [reviewsFile, setReviewsFile] = useState<File | null>(null);
  const [hoursResult, setHoursResult] = useState<ImportResult | null>(null);
  const [reviewsResult, setReviewsResult] = useState<ImportResult | null>(null);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  async function uploadHours() {
    if (!hoursFile) return;
    setHoursLoading(true);
    setHoursError(null);
    setHoursResult(null);
    try {
      const result = await managerApi.importTime(hoursFile);
      setHoursResult(result);
      onToast(`Hours uploaded — ${result.inserted} records updated.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setHoursError(msg);
      onToast(msg, "error");
    } finally {
      setHoursLoading(false);
    }
  }

  async function uploadReviews() {
    if (!reviewsFile) return;
    setReviewsLoading(true);
    setReviewsError(null);
    setReviewsResult(null);
    try {
      const result = await managerApi.importReviews(reviewsFile);
      setReviewsResult(result);
      onToast(`Reviews uploaded — ${result.inserted} records updated.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setReviewsError(msg);
      onToast(msg, "error");
    } finally {
      setReviewsLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 lg:p-7" style={cardStyle()}>
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_62%,#df0030_100%)]" />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex rounded-full px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]" style={{ background: "rgba(14,165,233,0.08)", color: "#0d6b9d" }}>
            Weekly HR Upload
          </p>
          <h2 className="mt-3 text-[1.12rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
            Push hours and reviews to all manager dashboards
          </h2>
          <p className="mt-1 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
            Upload one file for each type at the start of each week. Data routes automatically to each manager based on their assigned team — no manual sorting needed.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <UploadPanel
          title="Hours & Time Off"
          columns="employee_name · employee_id · week_start (optional) · regular_hours · ot_hours · vacation_hours · personal_hours · other_hours"
          onDownload={downloadHoursTemplate}
          file={hoursFile}
          onFileChange={setHoursFile}
          onUpload={uploadHours}
          loading={hoursLoading}
          result={hoursResult}
          error={hoursError}
          onClear={async () => {
            await adminApi.clearTime();
            setHoursResult(null);
            onToast("Hours data cleared from all dashboards.");
          }}
        />
        <UploadPanel
          title="Performance Reviews"
          columns="employee_id · review_type · due_date · completed · completed_date"
          onDownload={downloadReviewsTemplate}
          file={reviewsFile}
          onFileChange={setReviewsFile}
          onUpload={uploadReviews}
          loading={reviewsLoading}
          result={reviewsResult}
          error={reviewsError}
          onClear={async () => {
            await adminApi.clearReviews();
            setReviewsResult(null);
            onToast("Reviews data cleared from all dashboards.");
          }}
        />
      </div>
    </div>
  );
}

function RosterTable({
  rows,
  currentUserId,
  modules,
  allEmployees,
  onAction,
}: {
  rows: EmployeeRecord[];
  currentUserId: string;
  modules: ModuleSummary[];
  allEmployees: EmployeeRecord[];
  onAction: (message: string, tone?: "success" | "error") => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px]">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--card-border)" }}>
            {["Employee", "Track", "Progress", "Last Login", ""].map((header) => (
              <th key={header} className="px-6 py-3 text-left text-[0.66rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((employee) => (
            <EmployeeRow
              key={employee.employee_id}
              emp={employee}
              currentUserId={currentUserId}
              modules={modules}
              allEmployees={allEmployees}
              onDeleted={(message, tone = "success") => onAction(message, tone)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<EmployeeImportResult | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: employees, isLoading, mutate } = useSWR("admin-employees", () => adminApi.listEmployees() as Promise<EmployeeRecord[]>);
  const { data: allModules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const publishedModules = (allModules ?? []).filter((m) => m.status === "published").sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (user && !user.is_admin) {
      router.replace("/overview");
    }
  }, [router, user]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user.is_admin) return null;

  const total = employees?.length ?? 0;
  const loggedIn = employees?.filter((employee) => employee.first_login_at).length ?? 0;
  const started = employees?.filter((employee) => employee.progress.total_modules_seen > 0).length ?? 0;
  const adminCount = employees?.filter((employee) => employee.is_admin).length ?? 0;

  const allEmployees = employees ?? [];
  const departments = [...new Set(allEmployees.map((e) => e.department).filter(Boolean) as string[])].sort();
  const searchLower = searchQuery.trim().toLowerCase();
  const searchResults = searchLower
    ? [...allEmployees]
        .filter((e) => e.full_name.toLowerCase().includes(searchLower) || e.employee_id.toLowerCase().includes(searchLower))
        .sort((a, b) => a.last_name.localeCompare(b.last_name))
    : null;
  const allEmployeesSorted = [...allEmployees].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));

  function handleRosterAction(message: string, tone?: "success" | "error") {
    setToast({ message, tone: tone ?? "success" });
    void mutate();
  }

  return (
    <div className="mx-auto max-w-[1220px] px-6 py-6 lg:px-8 lg:py-8">
      {toast && (
        <div className="fixed right-6 top-24 z-[60]">
          <div
            className="rounded-[16px] px-4 py-3 text-[0.82rem] font-semibold shadow-[0_18px_36px_rgba(17,41,74,0.18)]"
            style={{
              background: toast.tone === "error" ? "linear-gradient(180deg, #fff4f6 0%, #ffe9ef 100%)" : "linear-gradient(180deg, #f4fdff 0%, #e9f8ff 100%)",
              border: toast.tone === "error" ? "1px solid rgba(223, 0, 48, 0.18)" : "1px solid rgba(14, 165, 233, 0.18)",
              color: toast.tone === "error" ? "#9f1239" : "#0d5f91",
            }}
          >
            {toast.message}
          </div>
        </div>
      )}

      {isImportOpen && (
        <ImportEmployeesModal
          onClose={() => setIsImportOpen(false)}
          onImported={(result) => {
            setLastImportResult(result);
            setToast({
              message: result.skipped > 0
                ? `Changes saved. ${result.added} imported, ${result.skipped} skipped.`
                : `Changes saved. ${result.added} employees imported.`,
              tone: "success",
            });
            void mutate();
          }}
        />
      )}

      <div className="relative overflow-hidden rounded-[28px] p-7 lg:p-8" style={{ background: "var(--welcome-bg)", border: "1px solid var(--welcome-border)", boxShadow: "var(--welcome-shadow)" }}>
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full" style={{ border: "1px solid var(--welcome-circle-border)" }} />
        <div className="absolute inset-x-0 top-0 h-[4px] bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_58%,#df0030_100%)]" />
        <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ background: "var(--welcome-label-bg)", color: "var(--welcome-label-text)" }}>
          <span className="h-2 w-2 rounded-full bg-[#df0030]" />
          Team Operations
        </p>
        <h1 className="mt-3 text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold leading-[1.06]" style={{ color: "var(--welcome-headline)" }}>
          Admin dashboard
        </h1>
        <p className="mt-2 max-w-[680px] text-[0.9rem] leading-[1.68]" style={{ color: "var(--welcome-body)" }}>
          Manage employee access, batch setup, and onboarding visibility without leaving the portal.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Enrolled Employees", value: total, note: "Current roster" },
          { label: "Logged In", value: loggedIn, note: "Have entered the portal" },
          { label: "Started Training", value: started, note: "Touched at least one module" },
          { label: "Admin Seats", value: adminCount, note: "Can manage people and content" },
        ].map((card) => (
          <div key={card.label} className="rounded-[22px] p-5" style={cardStyle()}>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>{card.label}</p>
            <p className="mt-3 text-[2rem] font-extrabold leading-none" style={{ color: "var(--heading-color)" }}>{card.value}</p>
            <p className="mt-1 text-[0.76rem]" style={{ color: "var(--card-desc)" }}>{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
        <AddEmployeeForm departments={departments} allEmployees={allEmployees} onAdded={(message) => {
          setToast({ message, tone: "success" });
          void mutate();
        }} />

        <div className="space-y-5">
          <div className="rounded-[24px] p-6" style={cardStyle()}>
            <p className="inline-flex rounded-full px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]" style={{ background: "rgba(14,165,233,0.08)", color: "#0d6b9d" }}>
              Bulk Enrollment
            </p>
            <h2 className="mt-3 text-[1.12rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
              Import employees in one pass
            </h2>
            <p className="mt-1 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
              Upload a CSV exported from Excel to add multiple employees by name, employee number, and track.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => setIsImportOpen(true)} className="rounded-[14px] px-4 py-2.5 text-[0.78rem] font-semibold text-white transition-all hover:-translate-y-px" style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)", boxShadow: "0 10px 22px rgba(17, 41, 74, 0.18)" }}>
                Import Employees
              </button>
              <button type="button" onClick={downloadImportTemplate} className="rounded-[14px] px-4 py-2.5 text-[0.78rem] font-semibold transition-all hover:-translate-y-px" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}>
                Download Template
              </button>
            </div>

            <div className="mt-5 rounded-[18px] px-4 py-4" style={{ background: "rgba(17,41,74,0.04)", border: "1px solid rgba(17,41,74,0.08)" }}>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>What to include</p>
              <p className="mt-2 text-[0.8rem] leading-[1.6]" style={{ color: "var(--welcome-label-text)" }}>
                Required: <span className="font-semibold">name</span>, <span className="font-semibold">employee_id</span>, <span className="font-semibold">track</span>. Optional: <span className="font-semibold">is_admin</span>, <span className="font-semibold">department</span>, <span className="font-semibold">manager_employee_id</span>.
              </p>
            </div>

            {lastImportResult && (
              <div className="mt-4 rounded-[18px] px-4 py-4" style={{ background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)" }}>
                <p className="text-[0.84rem] font-semibold" style={{ color: "var(--heading-color)" }}>
                  Last import: {lastImportResult.added} added, {lastImportResult.skipped} skipped
                </p>
                {lastImportResult.errors.length > 0 && (
                  <p className="mt-1 text-[0.76rem]" style={{ color: "var(--card-desc)" }}>
                    First issue: Row {lastImportResult.errors[0].row} {lastImportResult.errors[0].detail.toLowerCase()}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[24px] p-6" style={cardStyle()}>
            <p className="inline-flex rounded-full px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]" style={{ background: "rgba(223,0,48,0.08)", color: "#9f1239" }}>
              Admin Notes
            </p>
            <ul className="mt-4 space-y-3 text-[0.8rem] leading-[1.6]" style={{ color: "var(--welcome-label-text)" }}>
              <li>Use bulk import for new-hire groups or track-based setup waves.</li>
              <li>Use the add form for one-off hires, edits, and urgent same-day access.</li>
              <li>Removing an employee keeps their progress history intact.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <WeeklyUploadCard onToast={(msg, tone) => setToast({ message: msg, tone: tone ?? "success" })} />
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Employee Roster</p>
            <h2 className="mt-1 text-[1rem] font-bold" style={{ color: "var(--heading-color)" }}>
              Current employees{total > 0 && <span className="ml-1.5 font-normal text-[0.9rem]" style={{ color: "var(--card-desc)" }}>({total})</span>}
            </h2>
          </div>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--card-desc)" }}>
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="search"
              placeholder="Search by name or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-[14px] py-2 pl-9 pr-4 text-[0.82rem] outline-none transition-all"
              style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", width: "220px" }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !employees || employees.length === 0 ? (
          <div className="overflow-hidden rounded-[24px]" style={cardStyle()}>
            <p className="px-6 py-10 text-center text-[0.84rem]" style={{ color: "var(--card-desc)" }}>
              No employees yet. Start with the add form or bulk import above.
            </p>
          </div>
        ) : searchResults ? (
          <div className="overflow-hidden rounded-[24px]" style={cardStyle()}>
            <div className="border-b px-6 py-3" style={{ borderColor: "var(--card-border)" }}>
              <p className="text-[0.76rem]" style={{ color: "var(--card-desc)" }}>
                {searchResults.length === 0 ? "No results" : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`} for{" "}
                <span className="font-semibold" style={{ color: "var(--heading-color)" }}>"{searchQuery.trim()}"</span>
              </p>
            </div>
            {searchResults.length > 0 ? (
              <RosterTable rows={searchResults} currentUserId={user.employee_id} modules={publishedModules} allEmployees={allEmployees} onAction={handleRosterAction} />
            ) : (
              <p className="px-6 py-10 text-center text-[0.84rem]" style={{ color: "var(--card-desc)" }}>
                Try a different name or employee number.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px]" style={cardStyle()}>
            <RosterTable rows={allEmployeesSorted} currentUserId={user.employee_id} modules={publishedModules} allEmployees={allEmployees} onAction={handleRosterAction} />
          </div>
        )}
      </div>
    </div>
  );
}
