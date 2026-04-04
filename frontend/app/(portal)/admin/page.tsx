"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { adminApi, modulesApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { EmployeeImportResult, EmployeeImportRowInput, EmployeeRecord, ModuleSummary } from "@/lib/types";

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
  error?: string;
};

type ToastState = {
  message: string;
  tone?: "success" | "error";
};

const IMPORT_TEMPLATE = `name,employee_id,track,is_admin
Jane Doe,EMP-100,hr,false
Marcus Lane,EMP-101,warehouse,false
Olivia Grant,EMP-102,administrative,true
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

  if (nameIndex === -1 || employeeIdIndex === -1 || trackIndex === -1) {
    return { rows: [], fileError: "Template columns must include name, employee_id, and track." };
  }

  return {
    rows: csvRows.slice(1).map((row, index) => {
      const name = row[nameIndex]?.trim() ?? "";
      const employee_id = row[employeeIdIndex]?.trim() ?? "";
      const track = row[trackIndex]?.trim().toLowerCase() ?? "";
      const is_admin = coerceBoolean(row[isAdminIndex]);

      let error: string | undefined;
      if (!name) error = "Name is required.";
      else if (!employee_id) error = "Employee number is required.";
      else if (!track) error = "Track is required.";
      else if (!TRACKS.includes(track as (typeof TRACKS)[number])) error = `Track must be one of: ${TRACKS.join(", ")}.`;
      else if (name.trim().split(/\s+/).length < 2) error = "Name must include first and last name.";

      return { row: index + 2, name, employee_id, track, is_admin, error };
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

function AddEmployeeForm({ onAdded }: { onAdded: (message: string) => void }) {
  const [form, setForm] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    track: "hr",
    is_admin: false,
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
      await adminApi.createEmployee(form);
      setForm({ employee_id: "", first_name: "", last_name: "", track: "hr", is_admin: false });
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

        <div>
          <label className="mb-1.5 block text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>
            Track
          </label>
          <select
            value={form.track}
            onChange={(event) => update("track", event.target.value)}
            className="w-full rounded-[14px] px-3.5 py-2.5 text-[0.84rem] font-medium outline-none transition-all"
            style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
          >
            {TRACKS.map((track) => (
              <option key={track} value={track}>
                {TRACK_LABELS[track]}
              </option>
            ))}
          </select>
        </div>
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

function EmployeeRow({ emp, currentUserId, modules, onDeleted }: { emp: EmployeeRecord; currentUserId: string; modules: ModuleSummary[]; onDeleted: (message: string, tone?: "success" | "error") => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTrack, setEditTrack] = useState(emp.track);
  const [editAdmin, setEditAdmin] = useState(emp.is_admin);
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
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!moduleProgress) {
      setLoadingProgress(true);
      try {
        const data = await adminApi.employeeProgress(emp.employee_id) as ModuleProgress[];
        setModuleProgress(data);
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
      await adminApi.updateEmployee(emp.employee_id, { track: editTrack, is_admin: editAdmin });
      setEditing(false);
      onDeleted(`Updated ${emp.full_name} — track: ${TRACK_LABELS[editTrack] ?? editTrack}${editAdmin ? " (Admin)" : ""}.`);
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
            <select
              value={editTrack}
              onChange={(e) => setEditTrack(e.target.value)}
              className="rounded-[8px] border border-slate-200 bg-white px-2 py-1 text-[0.76rem] font-medium"
            >
              {Object.entries(TRACK_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[0.72rem] font-medium" style={{ color: "var(--card-desc)" }}>
              <input
                type="checkbox"
                checked={editAdmin}
                onChange={(e) => setEditAdmin(e.target.checked)}
                className="rounded"
              />
              Admin
            </label>
          </div>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold",
                emp.track === "hr"
                  ? "bg-blue-50 text-blue-700"
                  : emp.track === "warehouse"
                    ? "bg-amber-50 text-amber-700"
                    : emp.track === "management"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-fuchsia-50 text-fuchsia-700"
              )}
            >
              {TRACK_LABELS[emp.track] ?? emp.track}
            </span>
            {emp.is_admin && <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600">Admin</span>}
            {emp.totp_enabled && <span className="ml-2 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[0.68rem] font-semibold text-purple-700">2FA</span>}
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
              onClick={() => { setEditing(false); setEditTrack(emp.track); setEditAdmin(emp.is_admin); }}
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
                  Required: name, employee_id, track
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
                        {row.employee_id || "Missing employee number"} • {TRACK_LABELS[row.track] ?? row.track}
                        {row.is_admin ? " • Admin" : ""}
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

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<EmployeeImportResult | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

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
        <AddEmployeeForm onAdded={(message) => {
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
                Required columns: <span className="font-semibold">name</span>, <span className="font-semibold">employee_id</span>, and <span className="font-semibold">track</span>. Optional: <span className="font-semibold">is_admin</span>.
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

      <div className="mt-6 overflow-hidden rounded-[24px]" style={cardStyle()}>
        <div className="flex items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: "var(--card-border)" }}>
          <div>
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--module-context)" }}>Employee Roster</p>
            <h2 className="mt-1 text-[1rem] font-bold" style={{ color: "var(--heading-color)" }}>Current employees</h2>
          </div>
          <p className="text-[0.76rem]" style={{ color: "var(--card-desc)" }}>{total} total employees</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !employees || employees.length === 0 ? (
          <p className="px-6 py-10 text-center text-[0.84rem]" style={{ color: "var(--card-desc)" }}>
            No employees yet. Start with the add form or bulk import above.
          </p>
        ) : (
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
                {employees.map((employee) => (
                  <EmployeeRow
                    key={employee.employee_id}
                    emp={employee}
                    currentUserId={user.employee_id}
                    modules={publishedModules}
                    onDeleted={(message, tone = "success") => {
                      setToast({ message, tone });
                      void mutate();
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
