"use client";

import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";
import { PinInput } from "./PinInput";
import type { TotpSetupData } from "@/lib/types";

interface TotpSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

/* ── Animated shield icon ── */
function ShieldIcon({ animate = false, success = false }: { animate?: boolean; success?: boolean }) {
  return (
    <div
      className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500"
      style={{
        background: success
          ? "linear-gradient(135deg, #059669, #10b981)"
          : "linear-gradient(135deg, #0f6da3, #1e3a66)",
        boxShadow: success
          ? "0 8px 32px rgba(5, 150, 105, 0.3)"
          : "0 8px 32px rgba(15, 109, 163, 0.3)",
        animation: animate ? "shieldPulse 2s ease-in-out infinite" : "none",
        transform: success ? "scale(1.05)" : "scale(1)",
      }}
    >
      {success ? (
        <svg
          width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="checkmark-draw"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )}
    </div>
  );
}

/* ── Step indicator dots ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background: i === current
              ? "linear-gradient(90deg, #0f6da3, #1e3a66)"
              : i < current
                ? "#0f6da3"
                : "rgba(15, 109, 163, 0.15)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Keyframes injected once ── */
function AnimationStyles() {
  return (
    <style jsx global>{`
      @keyframes shieldPulse {
        0%, 100% { box-shadow: 0 8px 32px rgba(15, 109, 163, 0.3); }
        50% { box-shadow: 0 8px 40px rgba(15, 109, 163, 0.5), 0 0 0 8px rgba(15, 109, 163, 0.06); }
      }
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeSlideOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-12px); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes successBounce {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.15); }
        100% { transform: scale(1.05); opacity: 1; }
      }
      .checkmark-draw path {
        stroke-dasharray: 30;
        stroke-dashoffset: 30;
        animation: drawCheck 0.5s ease-out 0.2s forwards;
      }
      @keyframes drawCheck {
        to { stroke-dashoffset: 0; }
      }
      .step-enter { animation: fadeSlideIn 0.35s ease-out forwards; }
      .step-scale { animation: scaleIn 0.3s ease-out forwards; }
      .success-bounce { animation: successBounce 0.5s ease-out forwards; }
    `}</style>
  );
}

export function TotpSetup({ onComplete, onCancel }: TotpSetupProps) {
  const [step, setStep] = useState<"idle" | "scanning" | "success">("idle");
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showManualKey, setShowManualKey] = useState(false);

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

  async function handleConfirm() {
    if (code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.totpConfirmSetup(code.trim());
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Check your app and try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (code.length === 6 && step === "scanning" && !loading) {
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Auto-complete after success animation
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(onComplete, 1800);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  // Format the secret key in groups of 4
  const formattedSecret = setupData?.secret.match(/.{1,4}/g)?.join(" ") ?? "";

  return (
    <>
      <AnimationStyles />
      <div className="space-y-5">
        {/* ── Step 1: Get Started ── */}
        {step === "idle" && (
          <div className="step-enter rounded-[14px] p-6" style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
            <ShieldIcon animate />

            <h3 className="mt-4 text-center text-[1.05rem] font-bold" style={{ color: "var(--heading-color)" }}>
              Secure Your Account
            </h3>
            <p className="mx-auto mt-2 max-w-[280px] text-center text-[0.8rem] leading-relaxed" style={{ color: "var(--body-text)", opacity: 0.7 }}>
              Add two-factor authentication with an app like Google Authenticator or Microsoft Authenticator.
            </p>

            <StepIndicator current={0} total={3} />

            {error && (
              <div className="mt-3 rounded-[8px] px-3 py-2 text-center text-[0.78rem] font-medium" style={{ background: "rgba(220, 38, 38, 0.06)", color: "#dc2626" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[12px] px-5 py-3 text-[0.86rem] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
              style={{
                background: "linear-gradient(135deg, #0f6da3, #1e3a66)",
                boxShadow: "0 4px 16px rgba(15, 109, 163, 0.25)",
              }}
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
              {loading ? "Preparing..." : "Set Up Now"}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="mt-2 w-full py-2 text-center text-[0.76rem] font-medium transition-opacity hover:opacity-100"
                style={{ color: "var(--body-text)", opacity: 0.4 }}
              >
                Skip for now
              </button>
            )}
          </div>
        )}

        {/* ── Step 2: Scan QR & Enter Code ── */}
        {step === "scanning" && setupData && (
          <div className="step-enter rounded-[14px] p-6" style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
            <StepIndicator current={1} total={3} />

            <h3 className="mt-4 text-center text-[1.05rem] font-bold" style={{ color: "var(--heading-color)" }}>
              Scan QR Code
            </h3>
            <p className="mx-auto mt-1 max-w-[280px] text-center text-[0.78rem] leading-relaxed" style={{ color: "var(--body-text)", opacity: 0.7 }}>
              Open your authenticator app and scan this code
            </p>

            {/* QR Code with shadow & animation */}
            <div className="step-scale mt-4 flex justify-center">
              <div
                className="rounded-[14px] bg-white p-4"
                style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${setupData.qr_code}`}
                  alt="Scan this QR code with your authenticator app"
                  width={180}
                  height={180}
                  className="rounded-[4px]"
                />
              </div>
            </div>

            {/* Manual key toggle */}
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowManualKey(!showManualKey)}
                className="text-[0.72rem] font-semibold transition-colors hover:underline"
                style={{ color: "#0f6da3" }}
              >
                {showManualKey ? "Hide manual key" : "Can\u2019t scan? Enter key manually"}
              </button>
              {showManualKey && (
                <div className="step-enter mt-2">
                  <code
                    className="inline-block rounded-[8px] px-4 py-2 text-[0.8rem] font-mono tracking-[0.15em] select-all"
                    style={{
                      background: "rgba(15, 109, 163, 0.04)",
                      border: "1px solid rgba(15, 109, 163, 0.15)",
                      color: "var(--heading-color)",
                    }}
                  >
                    {formattedSecret}
                  </code>
                </div>
              )}
            </div>

            {/* PIN Input */}
            <div className="mt-5">
              <p className="mb-2.5 text-center text-[0.68rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--module-context)" }}>
                Enter the 6-digit code
              </p>
              <PinInput
                value={code}
                onChange={setCode}
                disabled={loading}
                autoFocus={false}
              />
            </div>

            {error && (
              <div className="step-enter mt-3 rounded-[8px] px-3 py-2 text-center text-[0.78rem] font-medium" style={{ background: "rgba(220, 38, 38, 0.06)", color: "#dc2626" }}>
                {error}
              </div>
            )}

            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-[0.78rem] font-medium" style={{ color: "#0f6da3" }}>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                Verifying...
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Success ── */}
        {step === "success" && (
          <div className="step-enter rounded-[14px] p-6" style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
            <StepIndicator current={2} total={3} />

            <div className="success-bounce mt-4">
              <ShieldIcon success />
            </div>

            <h3 className="mt-4 text-center text-[1.05rem] font-bold" style={{ color: "#059669" }}>
              You&apos;re All Set!
            </h3>
            <p className="mx-auto mt-2 max-w-[260px] text-center text-[0.8rem] leading-relaxed" style={{ color: "var(--body-text)", opacity: 0.7 }}>
              Two-factor authentication is now active. You&apos;ll enter a code from your app each time you sign in.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
