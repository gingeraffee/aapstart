"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { ApiError } from "@/lib/api";

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

export function LoginForm() {
  const { login } = useAuth();
  const [form, setForm] = useState({ full_name: "", employee_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitLogin(fullName: string, employeeId: string) {
    const trimmed = fullName.trim();
    const spaceIdx = trimmed.indexOf(" ");
    const first_name = spaceIdx >= 0 ? trimmed.slice(0, spaceIdx).trim() : trimmed;
    const last_name = spaceIdx >= 0 ? trimmed.slice(spaceIdx + 1).trim() : "";

    await login({
      employee_id: employeeId.trim(),
      first_name,
      last_name,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await submitLogin(form.full_name, form.employee_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevBypass() {
    setLoading(true);
    setError(null);

    try {
      await submitLogin("Dev User", "dev-001");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-[8px] border border-accent/15 bg-accent-soft px-3.5 py-2.5 text-[0.78rem] font-medium text-accent">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.1em] text-text-muted">
          Full Name
        </label>
        <input
          id="portal-full-name"
          type="text"
          autoComplete="name"
          placeholder="e.g. Jane Doe"
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          required
          className="w-full rounded-input border border-border bg-bg-light px-4 py-3 text-[0.88rem] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-brand-action focus:shadow-[0_0_0_3px_rgba(48,119,185,0.1)]"
        />
      </div>

      <div>
        <label htmlFor="employee_id" className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.1em] text-text-muted">
          Employee Number
        </label>
        <input
          id="employee_id"
          type="text"
          autoComplete="username"
          placeholder="Enter your employee number"
          value={form.employee_id}
          onChange={(e) => update("employee_id", e.target.value)}
          required
          className="w-full rounded-input border border-border bg-bg-light px-4 py-3 text-[0.88rem] text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-brand-action focus:shadow-[0_0_0_3px_rgba(48,119,185,0.1)]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-button bg-brand-ink px-4 py-3.5 text-[0.88rem] font-bold text-white transition-all hover:bg-[#1a2540] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] disabled:opacity-60 disabled:pointer-events-none"
      >
        {loading ? "Signing in..." : "Continue"}
      </button>

      {DEV_AUTH_BYPASS && (
        <div className="rounded-[10px] border border-brand-action/15 bg-brand-action/[0.05] p-4">
          <p className="text-[0.8rem] font-semibold text-brand-ink">Dev login enabled</p>
          <button
            type="button"
            onClick={handleDevBypass}
            disabled={loading}
            className="mt-2 w-full rounded-button border border-border bg-surface px-4 py-2.5 text-[0.84rem] font-semibold text-text-primary transition-all hover:bg-bg-light disabled:opacity-60"
          >
            Enter with dev profile
          </button>
        </div>
      )}
    </form>
  );
}
