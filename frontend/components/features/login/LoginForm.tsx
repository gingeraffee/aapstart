"use client";

import { useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface LoginFormProps {
  firstInputRef?: React.RefObject<HTMLInputElement>;
}

export function LoginForm({ firstInputRef }: LoginFormProps) {
  const { login } = useAuth();
  const [form, setForm] = useState({ full_name: "", employee_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmed = form.full_name.trim();
    const spaceIdx = trimmed.indexOf(" ");
    const first_name = spaceIdx >= 0 ? trimmed.slice(0, spaceIdx).trim() : trimmed;
    const last_name = spaceIdx >= 0 ? trimmed.slice(spaceIdx + 1).trim() : "";

    try {
      await login({
        employee_id: form.employee_id.trim(),
        first_name,
        last_name,
        access_code: "AAP",
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "h-14 w-full rounded-2xl border border-border bg-white px-4 text-[0.98rem] text-text-primary shadow-sm outline-none transition-all duration-200 placeholder:text-text-muted focus:border-brand-action focus:bg-info-surface/60 focus:shadow-[0_0_0_4px_rgba(48,119,185,0.12)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="full_name" className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
          Full name
        </label>
        <input
          ref={firstInputRef}
          id="full_name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          required
          className={inputClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="employee_id" className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
          Employee number
        </label>
        <input
          id="employee_id"
          type="text"
          autoComplete="username"
          placeholder="Enter your employee number"
          value={form.employee_id}
          onChange={(e) => update("employee_id", e.target.value)}
          required
          className={inputClassName}
        />
      </div>

      {error && (
        <div className="rounded-[22px] border border-brand-alert/15 bg-brand-alert/[0.04] px-4 py-3 text-ui text-brand-alert">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" loading={loading} className="w-full justify-center">
        Enter AAP Start
      </Button>

      <p className="text-caption text-text-muted">
        Use the same full name and employee number listed in the employee roster. Session access stays active while you work.
      </p>
    </form>
  );
}