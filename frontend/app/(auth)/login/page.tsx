"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/context/AuthContext";
import { LoginForm } from "@/components/features/login/LoginForm";
import { FullPageSpinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/overview");
    }
  }, [user, loading, router]);

  if (loading) return <FullPageSpinner />;
  if (user) return null;

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Hero Section */}
      <section className="relative min-h-[55vh] overflow-hidden bg-brand-ink text-white">
        {/* Top gradient stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 z-10 bg-gradient-to-r from-brand-deep via-brand-action to-accent" />

        {/* Radial gradient overlays */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0" style={{
            background: "radial-gradient(circle at 25% 30%, rgba(48, 119, 185, 0.15), transparent 40%), radial-gradient(circle at 75% 70%, rgba(223, 0, 42, 0.06), transparent 35%)"
          }} />
        </div>

        {/* Hero top bar */}
        <div className="relative z-[1] flex items-center justify-between px-8 py-6 lg:px-16">
          <Image src="/logo.png" alt="AAP Logo" width={176} height={44} className="h-11 w-auto" />
          <div className="hidden md:flex gap-2">
            {["What's Inside", "About AAP", "Your Benefits", "Life at AAP"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[0.7rem] font-semibold text-white/45 transition-colors hover:border-white/20 hover:text-white/65"
              >
                {label} &darr;
              </span>
            ))}
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-[1] mx-auto max-w-[600px] px-6 pb-4 pt-8 text-center animate-fade-up-slow" style={{ animationDelay: "100ms" }}>
          <span className="mb-6 inline-flex rounded-full border border-accent/20 bg-accent/[0.12] px-3.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-accent">
            Welcome Aboard
          </span>
          <h1 className="mt-4 text-[clamp(2.2rem,4vw,3.2rem)] font-extrabold leading-[1.08] tracking-[-0.04em]">
            Ready for day one?<br />
            <span className="text-brand-sky">You are now.</span>
          </h1>
          <p className="mt-4 text-[0.92rem] leading-[1.7] text-white/45">
            A smoother start begins here.<br />
            <strong className="text-white/70">Because day one already has enough surprises.</strong>
          </p>
        </div>
      </section>

      {/* Card wrapper - overlaps hero */}
      <div className="relative z-[5] -mt-20 flex justify-center px-6 pb-16">
        <div className="w-full max-w-[440px] animate-fade-up-slow overflow-hidden rounded-login-card bg-surface shadow-login" style={{ animationDelay: "200ms" }}>
          {/* Card gradient stripe */}
          <div className="h-1 bg-gradient-to-r from-brand-deep via-brand-action to-accent" />

          {/* Card body */}
          <div className="p-8 md:p-10">
            <h2 className="text-[1.4rem] font-extrabold tracking-[-0.03em] text-text-primary">
              Let&apos;s get you in.
            </h2>
            <p className="mt-1.5 text-[0.84rem] leading-[1.6] text-text-secondary">
              Enter your name and employee number to jump into your portal.
            </p>

            <div className="mt-8">
              <LoginForm />
            </div>

            <p className="mt-5 text-center text-[0.73rem] text-text-muted">
              Your credentials were provided by HR during onboarding.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="animate-fade-up-slow pb-10 text-center text-[0.68rem] text-text-muted" style={{ animationDelay: "300ms" }}>
        &copy; 2026 AAP &mdash; All rights reserved
      </footer>
    </div>
  );
}
