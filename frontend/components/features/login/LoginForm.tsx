"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { TotpSetup } from "./TotpSetup";
import { PinInput } from "./PinInput";

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

export function LoginForm() {
  const { login, totpPending, completeTotpLogin, cancelTotp, mustSetupTotp, clearMustSetupTotp } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", employee_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [totpCode, setTotpCode] = useState("");

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

  async function handleTotpVerify() {
    if (totpCode.length < 6 || loading) return;
    setLoading(true);
    setError(null);

    try {
      await completeTotpLogin(totpCode.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (totpCode.length === 6 && totpPending && !loading) {
      handleTotpVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totpCode]);

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

  // ── TOTP mandatory setup step ──
  if (mustSetupTotp) {
    return (
      <TotpSetup
        onComplete={() => {
          clearMustSetupTotp();
          router.push("/overview");
        }}
        onCancel={() => {}}
      />
    );
  }

  // ── TOTP verification step (returning user with 2FA enabled) ──
  if (totpPending) {
    return (
      <>
        <style jsx global>{`
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          .step-enter { animation: fadeSlideIn 0.35s ease-out forwards; }
        `}</style>
        <div className="step-enter space-y-5">
          {/* Shield header */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #0f6da3, #1e3a66)",
                boxShadow: "0 6px 24px rgba(15, 109, 163, 0.25)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>
                Verification Required
              </p>
              <p className="mt-1 text-[0.78rem]" style={{ color: "var(--body-text)", opacity: 0.6 }}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          </div>

          {error && (
            <div className="step-enter rounded-[8px] px-3 py-2 text-center text-[0.78rem] font-medium" style={{ background: "rgba(220, 38, 38, 0.06)", color: "#dc2626" }}>
              {error}
            </div>
          )}

          <PinInput
            value={totpCode}
            onChange={setTotpCode}
            disabled={loading}
          />

          {loading && (
            <div className="flex items-center justify-center gap-2 text-[0.78rem] font-medium" style={{ color: "#0f6da3" }}>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              Verifying...
            </div>
          )}

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full py-2 text-center text-[0.76rem] font-medium transition-opacity hover:opacity-100"
            style={{ color: "var(--body-text)", opacity: 0.4 }}
          >
            Back to login
          </button>
        </div>
      </>
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
