"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { TotpSetup } from "@/components/features/login/TotpSetup";

export default function SecurityPage() {
  const { user, mustSetupTotp, clearMustSetupTotp } = useAuth();
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(mustSetupTotp);
  const [success, setSuccess] = useState(false);

  function handleComplete() {
    setShowSetup(false);
    setSuccess(true);
    if (mustSetupTotp) {
      clearMustSetupTotp();
      // Redirect to the portal after mandatory setup
      router.push("/overview");
    }
  }

  return (
    <PageContainer size="narrow">
      <h1 className="text-[1.5rem] font-bold" style={{ color: "var(--heading-color)" }}>
        Security Settings
      </h1>
      <p className="mt-2 text-[0.88rem]" style={{ color: "var(--body-text)" }}>
        Manage two-factor authentication for your account.
      </p>

      {mustSetupTotp && (
        <div
          className="mt-4 rounded-[10px] px-4 py-3 text-[0.84rem] font-semibold"
          style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.3)", color: "#a16207" }}
        >
          Your organization requires two-factor authentication. Please set it up to continue.
        </div>
      )}

      <div className="mt-6">
        {success && (
          <div
            className="mb-4 rounded-[10px] px-4 py-3 text-[0.84rem] font-semibold"
            style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#059669" }}
          >
            Two-factor authentication has been enabled. You&apos;ll be asked for a code from your authenticator app each time you sign in.
          </div>
        )}

        {showSetup ? (
          <TotpSetup
            onComplete={handleComplete}
            onCancel={mustSetupTotp ? () => {} : () => setShowSetup(false)}
          />
        ) : !success ? (
          <div
            className="rounded-[10px] p-5"
            style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}
          >
            <h3 className="text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>
              Two-Factor Authentication
            </h3>
            <p className="mt-2 text-[0.82rem] leading-relaxed" style={{ color: "var(--body-text)" }}>
              Protect your account with an authenticator app. After setup, you&apos;ll enter a 6-digit code from the app each time you sign in.
            </p>
            <button
              onClick={() => setShowSetup(true)}
              className="mt-4 rounded-button px-5 py-2.5 text-[0.82rem] font-bold text-white transition-all hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #0b1428, #1a2540)" }}
            >
              Set Up Two-Factor Authentication
            </button>
          </div>
        ) : (
          <div
            className="rounded-[10px] p-5"
            style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}
          >
            <h3 className="text-[0.95rem] font-bold" style={{ color: "var(--heading-color)" }}>
              Two-Factor Authentication
            </h3>
            <p className="mt-2 text-[0.82rem] leading-relaxed" style={{ color: "var(--body-text)" }}>
              Your account is protected with two-factor authentication. If you need to reset it, contact an admin.
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
