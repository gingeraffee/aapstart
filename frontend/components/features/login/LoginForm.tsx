"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { TotpSetup } from "./TotpSetup";

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

export function LoginForm() {
  const { login, totpPending, completeTotpLogin, cancelTotp, mustSetupTotp, clearMustSetupTotp } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", employee_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // TOTP code state
  const [totpCode, setTotpCode] = useState("");
  const totpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the TOTP input when the step appears
  useEffect(() => {
    if (totpPending && totpInputRef.current) {
      totpInputRef.current.focus();
    }
  }, [totpPending]);

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

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await completeTotpLogin(totpCode.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    setError(null);
    setTotpCode("");
    cancelTotp();
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

  // ── TOTP mandatory setup step (modal on login page) ──
  if (mustSetupTotp) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-[8px] px-3.5 py-3 text-[0.82rem] font-semibold"
          style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.3)", color: "#a16207" }}
        >
          Your organization requires two-factor authentication. Set it up to continue.
        </div>
        <TotpSetup
          onComplete={() => {
            clearMustSetupTotp();
            router.push("/overview");
          }}
          onCancel={() => {}}
        />
      </div>
    );
  }

  // ── TOTP verification step ──
  if (totpPending) {
    return (
      <form onSubmit={handleTotpSubmit} className="space-y-5">
        <div className="rounded-[8px] border px-3.5 py-3 text-[0.82rem]" style={{ borderColor: "var(--login-input-border)", background: "var(--login-input-bg)", color: "var(--heading-color)" }}>
          <p className="font-semibold">Two-factor authentication</p>
          <p className="mt-1 opacity-70 text-[0.78rem]">
            Open your authenticator app and enter the 6-digit code for <strong>AAP Start</strong>.
          </p>
        </div>

        {error && (
          <div className="rounded-[8px] border border-accent/15 bg-accent-soft px-3.5 py-2.5 text-[0.78rem] font-medium text-accent">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="totp_code" className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>
            Verification Code
          </label>
          <input
            ref={totpInputRef}
            id="totp_code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
            required
            className="w-full rounded-input px-4 py-3 text-center text-[1.4rem] font-mono tracking-[0.3em] outline-none transition-all placeholder:opacity-30 focus:shadow-[0_0_0_3px_rgba(48,119,185,0.1)]"
            style={{
              background: "var(--login-input-bg)",
              border: "1px solid var(--login-input-border)",
              color: "var(--heading-color)",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || totpCode.length < 6}
          className="mt-2 w-full rounded-button px-4 py-3.5 text-[0.88rem] font-bold text-white transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] disabled:opacity-60 disabled:pointer-events-none"
          style={{ background: "linear-gradient(135deg, #0b1428, #1a2540)" }}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          onClick={handleBackToLogin}
          className="w-full text-[0.78rem] font-medium opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--heading-color)" }}
        >
          Back to login
        </button>
      </form>
    );
  }

  // ── Credentials step ──
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-[8px] border border-accent/15 bg-accent-soft px-3.5 py-2.5 text-[0.78rem] font-medium text-accent">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>
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
          className="w-full rounded-input px-4 py-3 text-[0.88rem] outline-none transition-all placeholder:opacity-50 focus:shadow-[0_0_0_3px_rgba(48,119,185,0.1)]"
          style={{
            background: "var(--login-input-bg)",
            border: "1px solid var(--login-input-border)",
            color: "var(--heading-color)",
          }}
        />
      </div>

      <div>
        <label htmlFor="employee_id" className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>
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
          className="w-full rounded-input px-4 py-3 text-[0.88rem] outline-none transition-all placeholder:opacity-50 focus:shadow-[0_0_0_3px_rgba(48,119,185,0.1)]"
          style={{
            background: "var(--login-input-bg)",
            border: "1px solid var(--login-input-border)",
            color: "var(--heading-color)",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-button px-4 py-3.5 text-[0.88rem] font-bold text-white transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] disabled:opacity-60 disabled:pointer-events-none"
        style={{ background: "linear-gradient(135deg, #0b1428, #1a2540)" }}
      >
        {loading ? "Signing in..." : "Continue"}
      </button>

      {DEV_AUTH_BYPASS && (
        <div className="rounded-[10px] p-4" style={{ border: "1px solid var(--login-input-border)", background: "var(--login-input-bg)" }}>
          <p className="text-[0.8rem] font-semibold" style={{ color: "var(--heading-color)" }}>Dev login enabled</p>
          <button
            type="button"
            onClick={handleDevBypass}
            disabled={loading}
            className="mt-2 w-full rounded-button px-4 py-2.5 text-[0.84rem] font-semibold transition-all disabled:opacity-60"
            style={{
              background: "var(--welcome-stat-bg)",
              border: "1px solid var(--login-input-border)",
              color: "var(--heading-color)",
            }}
          >
            Enter with dev profile
          </button>
        </div>
      )}
    </form>
  );
}
