"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { adminApi, managerApi, modulesApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { BambooImportResult, EmployeeImportResult, EmployeeImportRowInput, EmployeeRecord, ImportResult, ModuleSummary } from "@/lib/types";

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
  location: string;
  error?: string;
};

type ToastState = {
  message: string;
  tone?: "success" | "error";
};

const IMPORT_TEMPLATE = `name,employee_id,track,is_admin,department,manager_employee_id,location
Jane Doe,EMP-100,hr,false,Inside Sales,EMP-050,AAP Scottsboro
Marcus Lane,EMP-101,warehouse,false,,,API Memphis
Olivia Grant,EMP-102,administrative,true,Compliance,,AAP Scottsboro
Alex Kim,EMP-103,hr|warehouse,false,,,
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
  const locationIndex = headers.indexOf("location");

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
      const location = locationIndex >= 0 ? (row[locationIndex]?.trim() ?? "") : "";

      let error: string | undefined;
      if (!name) error = "Name is required.";
      else if (!employee_id) error = "Employee number is required.";
      else if (!track) error = "Track is required.";
      else if (!track.split(/[|,]/).map((t) => t.trim()).some((t) => TRACKS.includes(t as (typeof TRACKS)[number]))) error = `Track must include at least one of: ${TRACKS.join(", ")}.`;
      else if (name.trim().split(/\s+/).length < 2) error = "Name must include first and last name.";

      return { row: index + 2, name, employee_id, track, is_admin, department, manager_employee_id, location, error };
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

function EmployeeCard({ emp, currentUserId, modules, allEmployees, onAction }: { emp: EmployeeRecord; currentUserId: string; modules: ModuleSummary[]; allEmployees: EmployeeRecord[]; onAction: (message: string, tone?: "success" | "error") => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTracks, setEditTracks] = useState<string[]>(emp.tracks ?? ["hr"]);
  const [editAdmin, setEditAdmin] = useState(emp.is_admin);
  const [editIsManager, setEditIsManager] = useState(emp.is_manager ?? false);
  const [editIsExecutive, setEditIsExecutive] = useState(emp.is_executive ?? false);
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
  const isSelf = emp.employee_id === currentUserId;
  const lastLogin = emp.last_login_at
    ? new Date(emp.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Not yet";

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!moduleProgress) {
      setLoadingProgress(true);
      try {
        const progressData = await adminApi.employeeProgress(emp.employee_id) as ModuleProgress[];
        setModuleProgress(progressData);
      } catch {
        setModuleProgress([]);
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
      onAction("Changes saved. Employee removed.");
    } catch (err) {
      onAction(err instanceof Error ? err.message : "Failed to delete.", "error");
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
        is_executive: editIsExecutive,
        manager_employee_id: editManagerEmployeeId || null,
        department: editDepartment.trim() || null,
      });
      setEditing(false);
      const trackLabel = editTracks.map((t) => TRACK_LABELS[t] ?? t).join(", ");
      onAction(`Updated ${emp.full_name} - track: ${trackLabel}${editAdmin ? " (Admin)" : ""}${editIsManager ? " (Manager)" : ""}${editIsExecutive ? " (Executive)" : ""}.`);
    } catch (err) {
      onAction(err instanceof Error ? err.message : "Failed to update.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetProgress() {
    setResetting(true);
    try {
      await adminApi.resetProgress(emp.employee_id);
      setConfirmingReset(false);
      onAction(`Progress reset for ${emp.full_name}.`);
    } catch (err) {
      onAction(err instanceof Error ? err.message : "Failed to reset progress.", "error");
    } finally {
      setResetting(false);
    }
  }

  async function handleResetTotp() {
    setResettingTotp(true);
    try {
      await adminApi.resetTotp(emp.employee_id);
      onAction(`Two-factor authentication reset for ${emp.full_name}.`);
    } catch (err) {
      onAction(err instanceof Error ? err.message : "Failed to reset 2FA.", "error");
    } finally {
      setResettingTotp(false);
    }
  }

  return (
    <div className={cn("rounded-[14px] transition-all", expanded && "outline outline-1 outline-black/5")}>
      <button
        onClick={handleExpand}
        className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-all hover:bg-black/[0.025]"
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className={cn("shrink-0 transition-transform duration-200", expanded && "rotate-90")}
          style={{ color: "var(--card-desc)" }}
        >
          <path d="M3 1.5L7 5L3 8.5" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.86rem] font-semibold" style={{ color: "var(--heading-color)" }}>{emp.full_name}</p>
          <p className="text-[0.7rem]" style={{ color: "var(--module-context)" }}>{emp.employee_id}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {(emp.tracks ?? []).map((t) => (
            <span key={t} className={cn("inline-flex rounded-full px-2 py-0.5 text-[0.64rem] font-semibold",
              t === "hr" ? "bg-blue-50 text-blue-700"
              : t === "warehouse" ? "bg-amber-50 text-amber-700"
              : t === "management" ? "bg-emerald-50 text-emerald-700"
              : "bg-fuchsia-50 text-fuchsia-700"
            )}>
              {TRACK_LABELS[t] ?? t}
            </span>
          ))}
          {emp.is_admin && <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.64rem] font-semibold text-slate-600">Admin</span>}
          {emp.is_manager && <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[0.64rem] font-semibold text-emerald-700">Mgr</span>}
          {emp.is_executive && <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.64rem] font-semibold text-blue-700">Exec</span>}
        </div>
        <p className="ml-2 shrink-0 text-[0.7rem]" style={{ color: "var(--card-desc)" }}>{lastLogin}</p>
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4 pt-1">
          {editing ? (
            <div className="rounded-[14px] p-4" style={{ background: "rgba(241,245,249,0.6)", border: "1px solid rgba(153,182,218,0.25)" }}>
              <p className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Edit Employee</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[0.64rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>Tracks</p>
                  <div className="flex flex-col gap-1">
                    {Object.entries(TRACK_LABELS).map(([val, label]) => (
                      <label key={val} className="flex cursor-pointer items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
                        <input type="checkbox" checked={editTracks.includes(val)} onChange={(e) => { if (e.target.checked) setEditTracks((p) => [...p, val]); else setEditTracks((p) => p.filter((t) => t !== val)); }} className="rounded" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-col gap-1">
                    <label className="flex cursor-pointer items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
                      <input type="checkbox" checked={editAdmin} onChange={(e) => setEditAdmin(e.target.checked)} className="rounded" /> Admin
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
                      <input type="checkbox" checked={editIsManager} onChange={(e) => setEditIsManager(e.target.checked)} className="rounded" /> Manager
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
                      <input type="checkbox" checked={editIsExecutive} onChange={(e) => setEditIsExecutive(e.target.checked)} className="rounded" /> Executive
                    </label>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Department</p>
                    <input list={`dept-list-${emp.employee_id}`} value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="e.g. Inside Sales…" className="w-full rounded-[10px] px-2.5 py-1.5 text-[0.74rem]" style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }} />
                    <datalist id={`dept-list-${emp.employee_id}`}>{existingDepartments.map((d) => <option key={d} value={d} />)}</datalist>
                  </div>
                  <div>
                    <p className="mb-1 text-[0.64rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>Reports To</p>
                    <select value={editManagerEmployeeId} onChange={(e) => setEditManagerEmployeeId(e.target.value)} className="w-full rounded-[10px] px-2.5 py-1.5 text-[0.74rem]" style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}>
                      <option value="">No manager assigned</option>
                      {allEmployees.filter((e) => e.is_manager && e.employee_id !== emp.employee_id).sort((a, b) => a.last_name.localeCompare(b.last_name)).map((m) => (
                        <option key={m.employee_id} value={m.employee_id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setEditing(false); setEditTracks(emp.tracks ?? ["hr"]); setEditAdmin(emp.is_admin); setEditIsManager(emp.is_manager ?? false); setEditIsExecutive(emp.is_executive ?? false); setEditManagerEmployeeId(emp.manager_employee_id ?? ""); setEditDepartment(emp.department ?? ""); }} disabled={saving} className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50" style={{ color: "var(--card-desc)" }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          ) : (
            (emp.department || emp.manager_employee_id || emp.totp_enabled) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-[12px] px-3 py-2.5 text-[0.74rem]" style={{ background: "rgba(241,245,249,0.4)", border: "1px solid rgba(153,182,218,0.18)" }}>
                {emp.department && <span style={{ color: "var(--module-context)" }}><span className="font-semibold">Dept:</span> {emp.department}</span>}
                {emp.manager_employee_id && <span style={{ color: "var(--module-context)" }}><span className="font-semibold">Reports to:</span> {allEmployees.find((e) => e.employee_id === emp.manager_employee_id)?.full_name ?? emp.manager_employee_id}</span>}
                {emp.totp_enabled && <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[0.64rem] font-semibold text-purple-700">2FA enabled</span>}
              </div>
            )
          )}

          {!editing && (
            <div className="rounded-[14px] p-4" style={{ background: "rgba(241,245,249,0.6)", border: "1px solid rgba(153,182,218,0.25)" }}>
              <p className="mb-3 text-[0.66rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Module Progress</p>
              {loadingProgress ? (
                <div className="flex items-center gap-2 py-2"><Spinner /><span className="text-[0.76rem]" style={{ color: "var(--card-desc)" }}>Loading...</span></div>
              ) : (
                <div className="space-y-1.5">
                  {modules.filter((m) => m.status === "published").sort((a, b) => a.order - b.order).map((m) => {
                    const prog = moduleProgress?.find((p) => p.module_slug === m.slug);
                    const isCompleted = prog?.module_completed ?? false;
                    const isVisited = prog?.visited ?? false;
                    const completedDate = prog?.completed_at ? new Date(prog.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
                    return (
                      <div key={m.slug} className="flex items-center gap-2.5 rounded-[10px] px-3 py-2" style={{ background: isCompleted ? "rgba(22,163,74,0.06)" : isVisited ? "rgba(255,255,255,0.7)" : "transparent", border: isCompleted ? "1px solid rgba(22,163,74,0.15)" : "1px solid transparent" }}>
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: isCompleted ? "rgba(22,163,74,0.12)" : isVisited ? "rgba(14,165,233,0.1)" : "rgba(148,163,184,0.15)" }}>
                          {isCompleted ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.5l2 2L8 2.5" /></svg>
                            : isVisited ? <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="5" r="2" /></svg>
                            : <span className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(148,163,184,0.5)" }} />}
                        </span>
                        <span className="flex-1 text-[0.76rem] font-medium leading-tight" style={{ color: isCompleted ? "#15803d" : isVisited ? "var(--heading-color)" : "var(--card-desc)" }}>{m.title}</span>
                        {isCompleted && completedDate ? <span className="text-[0.64rem] font-medium" style={{ color: "#16a34a" }}>{completedDate}</span>
                          : isVisited ? <span className="text-[0.64rem] font-medium" style={{ color: "#0ea5e9" }}>In progress</span>
                          : <span className="text-[0.64rem] font-medium" style={{ color: "rgba(148,163,184,0.8)" }}>Not started</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!editing && (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[0.74rem]" style={{ color: "var(--card-desc)" }}>Remove {emp.full_name}?</span>
                <button onClick={() => setConfirmingDelete(false)} disabled={deleting} className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50" style={{ color: "var(--card-desc)" }}>Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "linear-gradient(135deg, #b91c1c 0%, #df0030 100%)" }}>{deleting ? "Removing..." : "Confirm"}</button>
              </div>
            ) : confirmingReset ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[0.74rem]" style={{ color: "var(--card-desc)" }}>Reset progress for {emp.full_name}?</span>
                <button onClick={() => setConfirmingReset(false)} disabled={resetting} className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50" style={{ color: "var(--card-desc)" }}>Cancel</button>
                <button onClick={handleResetProgress} disabled={resetting} className="rounded-[10px] px-3 py-1.5 text-[0.72rem] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)" }}>{resetting ? "Resetting..." : "Confirm Reset"}</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditing(true)} className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-blue-50" style={{ color: "#0369a1" }}>Edit</button>
                <button onClick={() => setConfirmingReset(true)} className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-amber-50" style={{ color: "#b45309" }}>Reset</button>
                {emp.totp_enabled && <button onClick={handleResetTotp} disabled={resettingTotp} className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50" style={{ color: "#7c3aed" }}>{resettingTotp ? "Resetting..." : "Reset 2FA"}</button>}
                {!isSelf && <button onClick={() => setConfirmingDelete(true)} disabled={deleting} className="rounded-[10px] px-3 py-1.5 text-[0.74rem] font-semibold transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" style={{ color: "#be123c" }}>Remove</button>}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ManagerGroup({
  managerName,
  employees,
  currentUserId,
  modules,
  allEmployees,
  onAction,
}: {
  managerName: string;
  employees: EmployeeRecord[];
  currentUserId: string;
  modules: ModuleSummary[];
  allEmployees: EmployeeRecord[];
  onAction: (message: string, tone?: "success" | "error") => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[20px]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 transition-all hover:bg-black/[0.02]">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className={cn("shrink-0 transition-transform duration-200", open && "rotate-90")} style={{ color: "var(--card-desc)" }}>
          <path d="M3 1.5L7 5L3 8.5" />
        </svg>
        <p className="flex-1 text-left text-[0.88rem] font-semibold" style={{ color: "var(--heading-color)" }}>{managerName}</p>
        <span className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold" style={{ background: "var(--welcome-stat-bg)", color: "var(--module-context)", border: "1px solid var(--welcome-stat-border)" }}>
          {employees.length} {employees.length === 1 ? "employee" : "employees"}
        </span>
      </button>
      {open && (
        <div className="space-y-1 border-t px-4 pb-4 pt-2" style={{ borderColor: "var(--card-border)" }}>
          {[...employees].sort((a, b) => a.last_name.localeCompare(b.last_name)).map((emp) => (
            <EmployeeCard key={emp.employee_id} emp={emp} currentUserId={currentUserId} modules={modules} allEmployees={allEmployees} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupedRoster({
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
  const groupMap = new Map<string, EmployeeRecord[]>();
  for (const emp of rows) {
    const key = emp.manager_employee_id ?? "__unassigned__";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(emp);
  }

  const sortedGroups = [...groupMap.entries()].sort(([aKey], [bKey]) => {
    if (aKey === "__unassigned__") return 1;
    if (bKey === "__unassigned__") return -1;
    const aName = allEmployees.find((e) => e.employee_id === aKey)?.full_name ?? aKey;
    const bName = allEmployees.find((e) => e.employee_id === bKey)?.full_name ?? bKey;
    return aName.localeCompare(bName);
  });

  return (
    <div className="space-y-3">
      {sortedGroups.map(([key, emps]) => {
        const manager = key !== "__unassigned__" ? allEmployees.find((e) => e.employee_id === key) : null;
        const managerName = manager?.full_name ?? (key !== "__unassigned__" ? key : "Unassigned");
        return (
          <ManagerGroup key={key} managerName={managerName} employees={emps} currentUserId={currentUserId} modules={modules} allEmployees={allEmployees} onAction={onAction} />
        );
      })}
    </div>
  );
}

function ImportEmployeesModal({ onClose, onImported }: { onClose: () => void; onImported: (result: EmployeeImportResult) => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isBamboo, setIsBamboo] = useState(false);
  const [bambooTrack, setBambooTrack] = useState("warehouse");
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<EmployeeImportResult | null>(null);
  const [bambooResult, setBambooResult] = useState<BambooImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const readyRows = rows.filter((row) => !row.error);
  const flaggedRows = rows.filter((row) => row.error);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    setResult(null);
    setBambooResult(null);
    setFileError(null);

    if (!picked) {
      setFileName(null);
      setFile(null);
      setIsBamboo(false);
      setRows([]);
      return;
    }

    setFileName(picked.name);
    setFile(picked);

    if (picked.name.toLowerCase().endsWith(".xlsx")) {
      setIsBamboo(true);
      setRows([]);
    } else {
      setIsBamboo(false);
      const parsed = parseImportFile(await picked.text());
      setRows(parsed.rows);
      setFileError(parsed.fileError ?? null);
    }
  }

  async function handleCsvImport() {
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
        location: row.location || undefined,
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

  async function handleBambooImport() {
    if (!file) return;
    setImporting(true);
    setFileError(null);
    try {
      const importResult = await adminApi.importBamboo(file, bambooTrack);
      setBambooResult(importResult);
      // Notify parent so employee list refreshes
      onImported({ added: importResult.created, skipped: importResult.skipped, errors: importResult.errors.map((e) => ({ ...e, employee_id: e.employee_id ?? null })) });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const canImport = isBamboo ? !!file : readyRows.length > 0;

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
                {isBamboo
                  ? "BambooHR format detected. New employees will be created with the track you select; existing employees will be updated."
                  : "Upload a CSV exported from Excel with employee name, employee number, and track."}
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-black/5" aria-label="Close import modal">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10" /></svg>
            </button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.08fr,0.92fr]">
            {/* Upload panel */}
            <div className="rounded-[20px] border p-5" style={{ background: "var(--welcome-stat-bg)", borderColor: "var(--welcome-stat-border)" }}>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Upload</p>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed px-5 py-10 text-center transition-all hover:-translate-y-px" style={{ borderColor: "rgba(14,165,233,0.35)", background: "rgba(14,165,233,0.05)" }}>
                <span className="text-[0.86rem] font-semibold" style={{ color: "var(--heading-color)" }}>{fileName ?? "Choose a file"}</span>
                <span className="mt-1 text-[0.76rem]" style={{ color: "var(--card-desc)" }}>
                  {isBamboo ? "BambooHR Employee Division & Department .xlsx" : "CSV template or BambooHR .xlsx"}
                </span>
                <input type="file" accept=".csv,.xlsx,text/csv" className="hidden" onChange={handleFileChange} />
              </label>

              {!isBamboo && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={downloadImportTemplate} className="rounded-[12px] px-4 py-2 text-[0.76rem] font-semibold transition-all hover:-translate-y-px" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}>
                    Download Template
                  </button>
                  <div className="rounded-[12px] px-4 py-2 text-[0.74rem] font-medium" style={{ background: "rgba(27,44,86,0.06)", color: "var(--welcome-label-text)" }}>
                    Required: name, employee_id, track · Optional: department, manager_employee_id, location
                  </div>
                </div>
              )}

              {isBamboo && (
                <div className="mt-4 space-y-3">
                  <p className="text-[0.72rem] font-semibold" style={{ color: "var(--module-context)" }}>Default track for new employees</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TRACKS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBambooTrack(t)}
                        className="rounded-[10px] px-3 py-2 text-[0.72rem] font-semibold transition-all"
                        style={{
                          background: bambooTrack === t ? "linear-gradient(135deg,#11264a,#0f7fb3)" : "var(--card-bg)",
                          color: bambooTrack === t ? "#fff" : "var(--heading-color)",
                          border: bambooTrack === t ? "1px solid transparent" : "1px solid var(--card-border)",
                        }}
                      >
                        {TRACK_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[0.7rem]" style={{ color: "var(--card-desc)" }}>
                    Only applied to employees not yet in the system. Existing employees are updated without changing their track.
                  </p>
                </div>
              )}

              {fileError && (
                <div className="mt-4 rounded-[14px] px-4 py-3 text-[0.8rem]" style={{ background: "rgba(223,0,48,0.08)", border: "1px solid rgba(223,0,48,0.16)", color: "#9f1239" }}>
                  {fileError}
                </div>
              )}
            </div>

            {/* Right panel: preview (CSV) or summary (BambooHR) */}
            <div className="rounded-[20px] border p-5" style={{ background: "var(--welcome-stat-bg)", borderColor: "var(--welcome-stat-border)" }}>
              {isBamboo ? (
                <>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>BambooHR Import</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[16px] px-4 py-3" style={{ background: "rgba(14,165,233,0.06)" }}>
                      <p className="text-[0.78rem] font-semibold" style={{ color: "var(--heading-color)" }}>What this does</p>
                      <ul className="mt-2 space-y-1 text-[0.74rem]" style={{ color: "var(--card-desc)" }}>
                        <li>· Creates employees that aren&apos;t in the system yet</li>
                        <li>· Updates location, division, and department for all</li>
                        <li>· Links managers from the &ldquo;Reporting to&rdquo; column</li>
                      </ul>
                    </div>
                    {bambooResult && (
                      <div className="rounded-[16px] px-4 py-3" style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.12)" }}>
                        <p className="text-[0.78rem] font-semibold" style={{ color: "var(--heading-color)" }}>Import complete</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div><p className="text-[1.1rem] font-extrabold" style={{ color: "var(--heading-color)" }}>{bambooResult.created}</p><p className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>Created</p></div>
                          <div><p className="text-[1.1rem] font-extrabold" style={{ color: "var(--heading-color)" }}>{bambooResult.updated}</p><p className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>Updated</p></div>
                          <div><p className="text-[1.1rem] font-extrabold" style={{ color: "var(--heading-color)" }}>{bambooResult.manager_linked}</p><p className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>Managers linked</p></div>
                          <div><p className="text-[1.1rem] font-extrabold" style={{ color: "var(--heading-color)" }}>{bambooResult.skipped}</p><p className="text-[0.68rem]" style={{ color: "var(--card-desc)" }}>Skipped</p></div>
                        </div>
                        {bambooResult.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {bambooResult.errors.slice(0, 5).map((e, idx) => (
                              <p key={idx} className="text-[0.72rem]" style={{ color: "#9f1239" }}>Row {e.row}: {e.detail}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {!bambooResult && (
                      <p className="text-[0.8rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
                        {file ? "Ready to import. Choose a default track and click Import." : "Select a BambooHR .xlsx file to continue."}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
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

                  {result && (
                    <div className="mt-4 rounded-[14px] border px-4 py-3" style={{ background: "rgba(17,41,74,0.04)", borderColor: "rgba(17,41,74,0.1)" }}>
                      <p className="text-[0.84rem] font-semibold" style={{ color: "var(--heading-color)" }}>{result.added} imported, {result.skipped} skipped</p>
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
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-[12px] px-4 py-2 text-[0.78rem] font-semibold transition-all hover:-translate-y-px" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}>
              Close
            </button>
            <button
              type="button"
              onClick={isBamboo ? handleBambooImport : handleCsvImport}
              disabled={!canImport || importing}
              className="rounded-[12px] px-4 py-2 text-[0.78rem] font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #11264a 0%, #0f7fb3 82%)" }}
            >
              {importing ? "Importing…" : isBamboo ? "Import BambooHR File" : `Import ${readyRows.length || ""}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerSnapshotView({ managerEmployeeId }: { managerEmployeeId: string }) {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const { data, isLoading } = useSWR(
    ["manager-snap", managerEmployeeId, currentMonth],
    () => managerApi.monthDashboard(currentMonth, undefined, managerEmployeeId) as Promise<import("@/lib/types").MonthDashboardData>,
  );

  if (isLoading) return <div className="py-4 text-center text-[0.8rem]" style={{ color: "var(--card-desc)" }}>Loading…</div>;
  if (!data) return null;

  const snap = data;

  const kpis = [
    { label: "Team Members", value: snap.team_size },
    { label: "Regular Hrs", value: snap.hours_summary.reduce((s, h) => s + h.regular_hours, 0).toFixed(1) },
    { label: "OT Hours", value: snap.hours_summary.reduce((s, h) => s + h.ot_hours, 0).toFixed(1) },
    { label: "Upcoming Reviews", value: snap.upcoming_reviews.length },
    { label: "Past Due Reviews", value: snap.past_due_reviews.length },
  ];

  const flagged = snap.team.filter((m) => m.threshold);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[14px] px-3 py-3 text-center" style={{ background: "var(--welcome-stat-bg)", border: "1px solid var(--welcome-stat-border)" }}>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>{k.label}</p>
            <p className="mt-1 text-[1.1rem] font-extrabold" style={{ color: "var(--heading-color)" }}>{k.value}</p>
          </div>
        ))}
      </div>
      {flagged.length > 0 && (
        <div className="rounded-[14px] px-4 py-3" style={{ background: "rgba(223,0,48,0.05)", border: "1px solid rgba(223,0,48,0.14)" }}>
          <p className="text-[0.72rem] font-bold" style={{ color: "#9f1239" }}>Threshold Alerts — {flagged.length} employee{flagged.length !== 1 ? "s" : ""}</p>
          <ul className="mt-1.5 space-y-0.5">
            {flagged.map((m) => (
              <li key={m.employee_id} className="text-[0.72rem]" style={{ color: "var(--heading-color)" }}>
                {m.full_name} — <span style={{ color: "#9f1239" }}>{m.point_total} pts ({m.threshold})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
  accept = ".csv,text/csv",
  fileTypeLabel = "CSV",
}: {
  title: string;
  columns: string;
  onDownload?: () => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onUpload: () => void;
  loading: boolean;
  result: ImportResult | null;
  error: string | null;
  onClear?: () => Promise<void>;
  accept?: string;
  fileTypeLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border p-5" style={{ background: "var(--welcome-stat-bg)", borderColor: "var(--welcome-stat-border)" }}>
      <div>
        <p className="text-[0.8rem] font-bold" style={{ color: "var(--heading-color)" }}>{title}</p>
        <p className="mt-0.5 font-mono text-[0.66rem]" style={{ color: "var(--module-context)" }}>{columns}</p>
      </div>

      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="self-start rounded-[12px] px-3.5 py-2 text-[0.75rem] font-semibold transition-all hover:-translate-y-px"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
        >
          Download Template
        </button>
      )}

      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed px-4 py-6 text-center transition-all hover:-translate-y-px"
        style={{ borderColor: "rgba(14,165,233,0.35)", background: "rgba(14,165,233,0.04)" }}
      >
        <span className="text-[0.82rem] font-semibold" style={{ color: "var(--heading-color)" }}>
          {file ? file.name : `Choose a ${fileTypeLabel} file`}
        </span>
        <span className="mt-0.5 text-[0.72rem]" style={{ color: "var(--card-desc)" }}>
          {file ? `${(file.size / 1024).toFixed(1)} KB` : "Click to browse"}
        </span>
        <input
          type="file"
          accept={accept}
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
  const [pointsFile, setPointsFile] = useState<File | null>(null);
  const [directoryFile, setDirectoryFile] = useState<File | null>(null);
  const [hoursResult, setHoursResult] = useState<ImportResult | null>(null);
  const [reviewsResult, setReviewsResult] = useState<ImportResult | null>(null);
  const [pointsResult, setPointsResult] = useState<ImportResult | null>(null);
  const [directoryResult, setDirectoryResult] = useState<ImportResult | null>(null);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  async function uploadHours() {
    if (!hoursFile) return;
    setHoursLoading(true);
    setHoursError(null);
    setHoursResult(null);
    try {
      const result = await managerApi.importTime(hoursFile);
      setHoursResult(result);
      onToast(`Payclock data uploaded — ${result.inserted} employees updated.`);
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
      onToast(`Reviews uploaded — ${result.inserted} upcoming reviews added.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setReviewsError(msg);
      onToast(msg, "error");
    } finally {
      setReviewsLoading(false);
    }
  }

  async function uploadPoints() {
    if (!pointsFile) return;
    setPointsLoading(true);
    setPointsError(null);
    setPointsResult(null);
    try {
      const result = await adminApi.importPoints(pointsFile);
      setPointsResult(result);
      onToast(`Point history uploaded — ${result.inserted} events loaded.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setPointsError(msg);
      onToast(msg, "error");
    } finally {
      setPointsLoading(false);
    }
  }

  async function uploadDirectory() {
    if (!directoryFile) return;
    setDirectoryLoading(true);
    setDirectoryError(null);
    setDirectoryResult(null);
    try {
      const result = await adminApi.importEmployeeDirectory(directoryFile);
      setDirectoryResult(result);
      onToast(`Employee directory synced — ${result.inserted} employees updated, ${result.manager_linked ?? 0} managers linked.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setDirectoryError(msg);
      onToast(msg, "error");
    } finally {
      setDirectoryLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 lg:p-7" style={cardStyle()}>
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#0ea5d9_0%,#22d3ee_62%,#df0030_100%)]" />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex rounded-full px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]" style={{ background: "rgba(14,165,233,0.08)", color: "#0d6b9d" }}>
            HR Data Uploads
          </p>
          <h2 className="mt-3 text-[1.12rem] font-extrabold tracking-[-0.02em]" style={{ color: "var(--heading-color)" }}>
            Four uploads power all dashboards
          </h2>
          <p className="mt-1 text-[0.82rem] leading-[1.6]" style={{ color: "var(--card-desc)" }}>
            Upload reports directly from Payclock, BambooHR, and your attendance tracker. Re-uploading is safe — data is replaced per employee, never duplicated.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <UploadPanel
          title="Payclock Export"
          columns="Employee Name · ID · Reg · OT 1 · Vac · Personal · Other"
          file={hoursFile}
          onFileChange={setHoursFile}
          onUpload={uploadHours}
          loading={hoursLoading}
          result={hoursResult}
          error={hoursError}
          accept=".xlsx,.csv,text/csv"
          fileTypeLabel="XLSX or CSV"
          onClear={async () => {
            await adminApi.clearTime();
            setHoursResult(null);
            onToast("Hours data cleared from all dashboards.");
          }}
        />
        <UploadPanel
          title="Performance Reviews"
          columns="Employee # · Review Date Due · Review Type"
          file={reviewsFile}
          onFileChange={setReviewsFile}
          onUpload={uploadReviews}
          loading={reviewsLoading}
          result={reviewsResult}
          error={reviewsError}
          accept=".xlsx,.csv,text/csv"
          fileTypeLabel="XLSX or CSV"
          onClear={async () => {
            await adminApi.clearReviews();
            setReviewsResult(null);
            onToast("Reviews data cleared from all dashboards.");
          }}
        />
        <UploadPanel
          title="Point History"
          columns="Employee # · Point Date · Point · Reason · Note · Flag Code · Point Total"
          file={pointsFile}
          onFileChange={setPointsFile}
          onUpload={uploadPoints}
          loading={pointsLoading}
          result={pointsResult}
          error={pointsError}
          accept=".xlsx,.csv,text/csv"
          fileTypeLabel="XLSX or CSV"
          onClear={async () => {
            await adminApi.clearPoints();
            setPointsResult(null);
            onToast("Point history cleared.");
          }}
        />
        <UploadPanel
          title="Employee Directory"
          columns="BambooHR Employee Division & Department export · Updates Location · Division · Department · Manager"
          file={directoryFile}
          onFileChange={setDirectoryFile}
          onUpload={uploadDirectory}
          loading={directoryLoading}
          result={directoryResult}
          error={directoryError}
          accept=".xlsx"
          fileTypeLabel="XLSX"
        />
      </div>
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
  const [viewingAsManager, setViewingAsManager] = useState<{ employee_id: string; full_name: string } | null>(null);

  const { data: employees, isLoading, mutate } = useSWR("admin-employees", () => adminApi.listEmployees() as Promise<EmployeeRecord[]>);
  const { data: allModules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: managersList } = useSWR("admin-managers", () => adminApi.managersList());
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
                Required: <span className="font-semibold">name</span>, <span className="font-semibold">employee_id</span>, <span className="font-semibold">track</span>. Optional: <span className="font-semibold">is_admin</span>, <span className="font-semibold">department</span>, <span className="font-semibold">manager_employee_id</span>, <span className="font-semibold">location</span>.
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

      {/* View as Manager */}
      <div className="relative mt-5 overflow-hidden rounded-[24px] p-6" style={cardStyle()}>
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#16a34a_0%,#0ea5d9_100%)]" />
        <p className="inline-flex rounded-full px-2.5 py-1 text-[0.64rem] font-bold uppercase tracking-[0.16em]" style={{ background: "rgba(22,163,74,0.08)", color: "#15803d" }}>
          View as Manager
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={viewingAsManager?.employee_id ?? ""}
            onChange={(e) => {
              const selected = (managersList ?? []).find((m) => m.employee_id === e.target.value);
              setViewingAsManager(selected ?? null);
            }}
            className="rounded-[12px] px-3 py-2 text-[0.82rem] outline-none"
            style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)", minWidth: "240px" }}
          >
            <option value="">Select a manager…</option>
            {(managersList ?? []).map((m) => (
              <option key={m.employee_id} value={m.employee_id}>
                {m.full_name}{m.department ? ` — ${m.department}` : ""}
              </option>
            ))}
          </select>
          {viewingAsManager && (
            <button
              onClick={() => setViewingAsManager(null)}
              className="rounded-[10px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all hover:opacity-70"
              style={{ background: "rgba(223,0,48,0.07)", color: "#9f1239" }}
            >
              ✕ Dismiss
            </button>
          )}
        </div>
        {viewingAsManager && (
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-2 rounded-[12px] px-4 py-2.5" style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.18)" }}>
              <span className="text-[0.78rem] font-semibold" style={{ color: "#15803d" }}>
                Viewing as: {viewingAsManager.full_name}
              </span>
            </div>
            <ManagerSnapshotView managerEmployeeId={viewingAsManager.employee_id} />
          </div>
        )}
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
              <div className="space-y-1 p-4">
                {searchResults.map((emp) => (
                  <EmployeeCard key={emp.employee_id} emp={emp} currentUserId={user.employee_id} modules={publishedModules} allEmployees={allEmployees} onAction={handleRosterAction} />
                ))}
              </div>
            ) : (
              <p className="px-6 py-10 text-center text-[0.84rem]" style={{ color: "var(--card-desc)" }}>
                Try a different name or employee number.
              </p>
            )}
          </div>
        ) : (
          <GroupedRoster rows={allEmployees} currentUserId={user.employee_id} modules={publishedModules} allEmployees={allEmployees} onAction={handleRosterAction} />
        )}
      </div>
    </div>
  );
}
