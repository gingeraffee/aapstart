"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { ScenePanel } from "@/components/features/login/ScenePanel";
import { LoginForm } from "@/components/features/login/LoginForm";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { BrandLockup } from "@/components/branding/BrandLockup";

const BENEFITS = [
  { title: "Track-specific guidance", body: "Your path stays tailored to your role, without exposing the track logic behind it." },
  { title: "Progress that stays with you", body: "Pause when you need to. Your onboarding progress, acknowledgements, and quiz state stay connected to your session." },
];

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/overview");
    }
  }, [user, loading, router]);

  const focusForm = useCallback(() => {
    firstInputRef.current?.focus({ preventScroll: true });
  }, []);

  if (loading) return <FullPageSpinner />;
  if (user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#020d1a_0%,#071529_50%,#0a1f3e_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-white/8 blur-3xl" />
        <div className="absolute right-[-10rem] top-[16%] h-[26rem] w-[26rem] rounded-full bg-brand-action/20 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-[22%] h-[28rem] w-[28rem] rounded-full bg-brand-deep/35 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[100rem] items-center px-4 py-6 md:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_40px_140px_rgba(3,8,18,0.35)] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[44rem] border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%)]" />
            <ScenePanel onCtaClick={focusForm} />
          </div>

          <div className="relative flex items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,248,0.95)_100%)] px-5 py-8 text-text-primary md:px-8 lg:px-10">
            <div className="pointer-events-none absolute inset-0 bg-page-grid opacity-40" />
            <div className="relative z-10 w-full max-w-[35rem] space-y-6">
              <div className="space-y-5">
                <span className="section-kicker">Access your onboarding path</span>
                <BrandLockup className="border-black/15 bg-black p-2.5 shadow-[0_16px_32px_rgba(15,23,42,0.16)]" imageClassName="w-[13rem] md:w-[15rem]" priority />
                <div className="space-y-3">
                  <h1 className="max-w-xl text-h1 font-display text-brand-ink">A calmer, clearer start to AAP.</h1>
                  <p className="max-w-2xl text-ui text-text-secondary">
                    Sign in to pick up your guided onboarding path, move through each module with confidence, and keep your progress wherever you left off.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {BENEFITS.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/80 bg-white/[0.72] p-4 shadow-sm backdrop-blur-xl">
                    <p className="text-ui font-semibold text-text-primary">{item.title}</p>
                    <p className="mt-2 text-caption text-text-secondary">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="premium-panel rounded-[32px] p-6 md:p-8">
                <div className="relative z-10 space-y-6">
                  <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] shadow-[0_16px_34px_rgba(36,54,115,0.18)]">
                        <Image src="/logo.png" alt="AAP" width={34} height={34} priority />
                      </div>
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Secure portal access</p>
                        <h2 className="mt-1 text-[1.4rem] font-semibold tracking-[-0.03em] text-brand-ink">Welcome to AAP Start</h2>
                      </div>
                    </div>
                    <span className="rounded-full border border-brand-action/15 bg-brand-action/[0.08] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-action">
                      Employees only
                    </span>
                  </div>

                  <LoginForm firstInputRef={firstInputRef} />
                </div>
              </div>

              <p className="text-caption text-white/60 lg:text-text-muted">
                Need help accessing your onboarding? HR and your supervisor can help confirm your roster details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}