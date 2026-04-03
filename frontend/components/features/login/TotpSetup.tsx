"use client";

import { useState } from "react";
import { authApi } from "@/lib/api";
import type { TotpSetupData } from "@/lib/types";

interface TotpSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function TotpSetup({ onComplete, onCancel }: TotpSetupProps) {
  const [step, setStep] = useState<"idle" | "scanning" | "confirming">("idle");
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStartSetup() {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.totpSetup() as TotpSetupData;
      setSetupData(data);
      setStep("scanning");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start setup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.totpConfirmSetup(code.trim());
      setStep("confirming");
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "idle") {
    return (
      <div className="space-y-4">
        <div className="rounded-[10px] p-5" style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
          <h3 className="text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>
            Set Up Two-Factor Authentication
          </h3>
          <p className="mt-2 text-[0.82rem] leading-relaxed" style={{ color: "var(--body-text)" }}>
            Add an extra layer of security to your account. You&apos;ll need an authenticator app like
            Google Authenticator or Microsoft Authenticator on your phone.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="rounded-button px-5 py-2.5 text-[0.82rem] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0b1428, #1a2540)" }}
            >
              {loading ? "Setting up..." : "Get Started"}
            </button>
            <button
              onClick={onCancel}
              className="rounded-button px-5 py-2.5 text-[0.82rem] font-medium transition-opacity opacity-60 hover:opacity-100"
              style={{ color: "var(--heading-color)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scanning step — show QR code and secret, then verify
  return (
    <div className="space-y-4">
      <div className="rounded-[10px] p-5" style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
        <h3 className="text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>
          Scan This QR Code
        </h3>
        <p className="mt-2 text-[0.82rem] leading-relaxed" style={{ color: "var(--body-text)" }}>
          Open your authenticator app and scan the code below. Then enter the 6-digit code it shows to confirm.
        </p>

        {setupData && (
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="rounded-lg bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${setupData.qr_code}`}
                alt="Scan this QR code with your authenticator app"
                width={200}
                height={200}
              />
            </div>
            <div className="w-full">
              <p className="text-[0.72rem] font-bold uppercase tracking-wider opacity-50" style={{ color: "var(--body-text)" }}>
                Or enter this key manually
              </p>
              <code
                className="mt-1 block rounded-[6px] px-3 py-2 text-[0.82rem] font-mono tracking-wider select-all"
                style={{ background: "var(--login-input-bg)", border: "1px solid var(--login-input-border)", color: "var(--heading-color)" }}
              >
                {setupData.secret}
              </code>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-[8px] border border-accent/15 bg-accent-soft px-3.5 py-2.5 text-[0.78rem] font-medium text-accent">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="mt-4 space-y-3">
          <div>
            <label htmlFor="totp_confirm_code" className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--module-context)" }}>
              Verification Code
            </label>
            <input
              id="totp_confirm_code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              className="w-full rounded-input px-4 py-3 text-center text-[1.4rem] font-mono tracking-[0.3em] outline-none transition-all placeholder:opacity-30 focus:shadow-[0_0_0_3px_rgba(48,119,185,0.1)]"
              style={{
                background: "var(--login-input-bg)",
                border: "1px solid var(--login-input-border)",
                color: "var(--heading-color)",
              }}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="flex-1 rounded-button px-5 py-2.5 text-[0.82rem] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0b1428, #1a2540)" }}
            >
              {loading ? "Verifying..." : "Confirm & Enable"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-button px-5 py-2.5 text-[0.82rem] font-medium transition-opacity opacity-60 hover:opacity-100"
              style={{ color: "var(--heading-color)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
