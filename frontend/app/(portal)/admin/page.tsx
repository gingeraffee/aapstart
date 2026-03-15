"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { adminApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { EmployeeRecord } from "@/lib/types";

const TRACKS = ["hr", "warehouse", "administrative"] as const;
const TRACK_LABELS: Record<string, string> = {
  hr: "HR",
  warehouse: "Warehouse",
  administrative: "Administrative",
};

// ── Add Employee Form ─────────────────────────────────────────────────────────

function AddEmployeeForm({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({ employee_id: "", first_name: "", last_name: "", track: "hr", is_admin: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.createEmployee(form);
      setForm({ employee_id: "", first_name: "", last_name: "", track: "hr", is_admin: false });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
      <h2 className="mb-4 text-[0.95rem] font-bold text-slate-800">Add Employee</h2>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-[0.78rem] text-red-700 border border-red-100">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">First Name</label>
          <input required value={form.first_name} onChange={(e) => update("first_name", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div>
          <label className="mb-1 block text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">Last Name</label>
          <input required value={form.last_name} onChange={(e) => update("last_name", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div>
          <label className="mb-1 block text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">Employee ID</label>
          <input required value={form.employee_id} onChange={(e) => update("employee_id", e.target.value)}
            placeholder="e.g. EMP-042"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div>
          <label className="mb-1 block text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">Track</label>
          <select value={form.track} onChange={(e) => update("track", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[0.84rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200">
            {TRACKS.map((t) => <option key={t} value={t}>{TRACK_LABELS[t]}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input type="checkbox" id="is_admin" checked={form.is_admin} onChange={(e) => update("is_admin", e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600" />
        <label htmlFor="is_admin" className="text-[0.8rem] text-slate-600">Admin access</label>
      </div>
      <button type="submit" disabled={loading}
        className="mt-4 rounded-lg bg-brand-bright px-5 py-2.5 text-[0.82rem] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60">
        {loading ? "Adding…" : "Add Employee"}
      </button>
    </form>
  );
}

// ── Employee Row ──────────────────────────────────────────────────────────────

function EmployeeRow({ emp, currentUserId, onDeleted }: { emp: EmployeeRecord; currentUserId: string; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove ${emp.full_name}? Their progress data will remain.`)) return;
    setDeleting(true);
    try {
      await adminApi.deleteEmployee(emp.employee_id);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  const firstLogin = emp.first_login_at
    ? new Date(emp.first_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Not yet";

  const isSelf = emp.employee_id === currentUserId;

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-4">
        <p className="text-[0.84rem] font-semibold text-slate-800 leading-tight">{emp.full_name}</p>
        <p className="text-[0.72rem] text-slate-400">{emp.employee_id}</p>
      </td>
      <td className="py-3 pr-4">
        <span className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold",
          emp.track === "hr" ? "bg-blue-50 text-blue-700" :
          emp.track === "warehouse" ? "bg-amber-50 text-amber-700" :
          "bg-purple-50 text-purple-700"
        )}>
          {TRACK_LABELS[emp.track] ?? emp.track}
        </span>
        {emp.is_admin && (
          <span className="ml-1.5 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600">Admin</span>
        )}
      </td>
      <td className="py-3 pr-4">
        <p className="text-[0.82rem] font-semibold text-slate-700">{emp.progress.modules_completed} modules</p>
        <p className="text-[0.7rem] text-slate-400">completed</p>
      </td>
      <td className="py-3 pr-4 text-[0.78rem] text-slate-500">{firstLogin}</td>
      <td className="py-3">
        {!isSelf && (
          <button onClick={handleDelete} disabled={deleting}
            className="rounded-lg px-3 py-1.5 text-[0.74rem] font-semibold text-red-500 transition-all hover:bg-red-50 disabled:opacity-50">
            {deleting ? "…" : "Remove"}
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: employees, isLoading, mutate } = useSWR(
    "admin-employees",
    () => adminApi.listEmployees() as Promise<EmployeeRecord[]>
  );

  // Redirect non-admins
  if (!user?.is_admin) {
    router.replace("/overview");
    return null;
  }

  const total = employees?.length ?? 0;
  const loggedIn = employees?.filter((e) => e.first_login_at).length ?? 0;
  const completed = employees?.filter((e) => e.progress.modules_completed > 0).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[1.5rem] font-bold text-slate-800">Admin Dashboard</h1>
        <p className="mt-1 text-[0.88rem] text-slate-500">Manage employee accounts and track onboarding progress.</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total Employees", value: total },
          { label: "Logged In", value: loggedIn },
          { label: "Started Modules", value: completed },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl bg-white p-5 text-center"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-[1.8rem] font-extrabold text-brand-bright">{value}</p>
            <p className="text-[0.76rem] font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Add employee */}
      <div className="mb-6">
        <AddEmployeeForm onAdded={() => mutate()} />
      </div>

      {/* Employee table */}
      <div className="rounded-2xl bg-white"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-[0.95rem] font-bold text-slate-800">Employees</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !employees || employees.length === 0 ? (
          <p className="px-6 py-8 text-center text-[0.84rem] text-slate-400">No employees yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full px-6">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Employee", "Track", "Progress", "First Login", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="px-6">
                {employees.map((emp) => (
                  <tr key={emp.employee_id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3">
                      <p className="text-[0.84rem] font-semibold text-slate-800">{emp.full_name}</p>
                      <p className="text-[0.72rem] text-slate-400">{emp.employee_id}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold",
                        emp.track === "hr" ? "bg-blue-50 text-blue-700" :
                        emp.track === "warehouse" ? "bg-amber-50 text-amber-700" :
                        "bg-purple-50 text-purple-700"
                      )}>
                        {TRACK_LABELS[emp.track] ?? emp.track}
                      </span>
                      {emp.is_admin && (
                        <span className="ml-1.5 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600">Admin</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-[0.82rem] font-semibold text-slate-700">{emp.progress.modules_completed} completed</p>
                    </td>
                    <td className="px-6 py-3 text-[0.78rem] text-slate-500">
                      {emp.first_login_at
                        ? new Date(emp.first_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Not yet"}
                    </td>
                    <td className="px-6 py-3">
                      {emp.employee_id !== user.employee_id && (
                        <button onClick={async () => {
                          if (!confirm(`Remove ${emp.full_name}? Their progress data will remain.`)) return;
                          try {
                            await adminApi.deleteEmployee(emp.employee_id);
                            mutate();
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Failed to delete.");
                          }
                        }}
                          className="rounded-lg px-3 py-1.5 text-[0.74rem] font-semibold text-red-500 transition-all hover:bg-red-50">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
