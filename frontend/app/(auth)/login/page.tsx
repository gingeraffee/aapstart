"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/context/AuthContext";
import { LoginForm } from "@/components/features/login/LoginForm";
import { FullPageSpinner } from "@/components/ui/Spinner";

const SCENE_COUNT = 5;

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const storyPanelRef = useRef<HTMLElement>(null);
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/overview");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const panel = storyPanelRef.current;
    if (!panel) return;

    const scenes = panel.querySelectorAll<HTMLElement>(".login-scene");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Array.from(scenes).indexOf(entry.target as HTMLElement);
            if (idx !== -1) setActiveScene(idx);
          }
        });
      },
      { root: panel, threshold: 0.4 }
    );

    scenes.forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, []);

  function scrollToScene(index: number) {
    const panel = storyPanelRef.current;
    if (!panel) return;
    const scenes = panel.querySelectorAll<HTMLElement>(".login-scene");
    scenes[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) return <FullPageSpinner />;
  if (user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-brand-ink">

      {/* ── Scroll progress dots ── */}
      <nav
        className="fixed right-3 top-1/2 z-50 -translate-y-1/2 hidden lg:flex flex-col gap-2"
        aria-label="Page sections"
      >
        {Array.from({ length: SCENE_COUNT }, (_, i) => (
          <button
            key={i}
            onClick={() => scrollToScene(i)}
            aria-label={`Go to section ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeScene === i
                ? "w-2 bg-brand-sky"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </nav>

      {/* ── Left: scrollable story panel ── */}
      <section
        ref={storyPanelRef}
        aria-label="Portal introduction"
        className="relative w-full lg:w-[58%] overflow-y-scroll snap-y snap-mandatory text-white scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          backgroundColor: "#0f1d3c",
          backgroundImage: "radial-gradient(ellipse 130% 75% at 0% 0%, rgba(48,119,185,0.80) 0%, transparent 72%)",
        }}
      >

        {/* ── Scene 1: Hero ── */}
        <div className="login-scene snap-start h-screen flex flex-col relative z-[2] px-8 py-8 lg:px-16 lg:py-10">
          {/* Top bar */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <Image src="/logo.png" alt="AAP | API logos" width={340} height={85} className="h-18 w-auto" priority />
              <span className="inline-flex w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3.5 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-cyan-300">
                Welcome Aboard
              </span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="flex-1 flex flex-col justify-center max-w-[560px] animate-fade-up-slow" style={{ animationDelay: "80ms" }}>
            <h1 className="text-[clamp(2.9rem,5.5vw,4.4rem)] font-bold leading-[1.04] text-white">
              Ready for day one?<br />
              <em className="not-italic text-[#8ecfff]">You are now.</em>
            </h1>
            <p className="mt-5 text-[1.02rem] leading-[1.75] text-white/85">
              A smoother start begins here.<br />
              <strong className="font-semibold text-white/95">Because day one already has enough surprises.</strong>
            </p>
          </div>

          {/* Bottom nav tiles */}
          <div className="mt-auto">
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: "What's Inside", index: 1 },
                { label: "About AAP", index: 2 },
                { label: "Your Benefits", index: 3 },
                { label: "Life at AAP", index: 4 },
              ].map(({ label, index }) => (
                <button
                  key={label}
                  onClick={() => scrollToScene(index)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[0.72rem] font-semibold text-white/65 transition-all hover:border-white/22 hover:bg-white/[0.07] hover:text-white/90"
                >
                  {label} ↓
                </button>
              ))}
            </div>
            <p className="text-[0.65rem] text-white/22">© 2026 AAP — All rights reserved</p>
          </div>
        </div>

        {/* ── Scene 2: What's Inside ── */}
        <div className="login-scene snap-start min-h-screen flex items-center relative z-[2] px-8 py-16 lg:px-16">
          <div className="w-full max-w-[560px]">
            <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand-sky">What's Inside</p>
            <h2 className="text-[clamp(2.05rem,4vw,3.1rem)] font-bold leading-[1.1] text-white">
              Your first 90 days,<br />mapped out and ready.
            </h2>
            <p className="mt-4 text-[0.97rem] leading-[1.75] text-white/90">
              Everything you need to hit the ground running is already waiting for you inside.
              No hunting, no guessing — just clear, structured onboarding from the moment you sign in.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: "📚", label: "Guided Training Modules", sub: "Self-paced, built around how you work" },
                { icon: "🗺️", label: "90-Day Roadmap", sub: "Your 30-60-90 milestones, crystal clear" },
                { icon: "📋", label: "Handbook + Policies", sub: "Everything you need to know, in one place" },
                { icon: "🎯", label: "Benefits Breakdown", sub: "Your full benefit plan, explained simply" },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-start gap-4 rounded-[16px] bg-white/[0.04] p-5 transition-all hover:bg-white/[0.07]"
                  style={{ boxShadow: "0 0 0 1.5px rgba(93,159,210,0.35), 0 0 28px rgba(93,159,210,0.18), 0 4px 8px rgba(0,0,0,0.25), 0 12px 28px rgba(0,0,0,0.22)" }}
                >
                  <span className="text-2xl" aria-hidden="true">{p.icon}</span>
                  <div>
                    <p className="text-[1rem] font-semibold text-white">{p.label}</p>
                    <p className="mt-1 text-[0.94rem] leading-[1.55] text-white/80">{p.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Scene 3: About AAP ── */}
        <div className="login-scene snap-start min-h-screen flex items-center relative z-[2] px-8 py-16 lg:px-16">
          <div className="w-full max-w-[560px]">
            <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand-sky">About AAP</p>
            <h2 className="text-[clamp(2.05rem,4vw,3.1rem)] font-bold leading-[1.1] text-white">
              Powering independent<br />pharmacies across America.
            </h2>
            <p className="mt-4 text-[0.97rem] leading-[1.75] text-white/90">
              Founded in 2009 from the union of API and United Drugs, AAP became one of America's largest
              member-owned independent pharmacy cooperatives. We fight to keep community pharmacies
              competitive, profitable, and thriving — and now you're part of that mission.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { number: "2,100+", label: "Member Pharmacies" },
                { number: "2009", label: "Year Founded" },
                { number: "Scottsboro", label: "Headquarters, AL" },
              ].map((s) => (
                <div key={s.label} className="rounded-[14px] bg-white/[0.04] p-4" style={{ boxShadow: "0 0 0 1.5px rgba(93,159,210,0.35), 0 0 28px rgba(93,159,210,0.18), 0 4px 8px rgba(0,0,0,0.25), 0 12px 28px rgba(0,0,0,0.22)" }}>
                  <p className="text-[1.4rem] font-bold leading-none text-white">{s.number}</p>
                  <p className="mt-1.5 text-[0.76rem] font-semibold uppercase tracking-[0.1em] text-white/75">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[14px] border-l-2 border-brand-sky/50 bg-white/[0.03] px-5 py-4">
              <p className="text-[0.9rem] italic leading-[1.75] text-white/85">
                "AAP provides support and customized solutions for independent community pharmacies
                to enhance their profitability, streamline their operations, and improve the quality of patient care."
              </p>
            </div>
          </div>
        </div>

        {/* ── Scene 4: Benefits ── */}
        <div className="login-scene snap-start min-h-screen flex items-center relative z-[2] px-8 py-16 lg:px-16">
          <div className="w-full max-w-[560px]">
            <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand-sky">Your Benefits</p>
            <h2 className="text-[clamp(2.05rem,4vw,3.1rem)] font-bold leading-[1.1] text-white">
              You're covered.<br />Seriously covered.
            </h2>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {[
                { icon: "🏥", title: "Medical", detail: "BlueCross BlueShield of Alabama — PPO or HDHP+HSA with company HSA contribution." },
                { icon: "💰", title: "401(k) Match", detail: "100% match on first 3%, 50% on next 2%. Fully vested from day one." },
                { icon: "🦷", title: "Dental + Vision", detail: "Guardian plans. Preventive care covered at 100%." },
                { icon: "🛡️", title: "Life & AD&D", detail: "Company-paid life insurance up to your annual salary." },
                { icon: "📱", title: "Free Teladoc", detail: "24/7 telehealth for medical and mental health. Completely free." },
                { icon: "🌿", title: "EAP + Perks", detail: "Life Matters counseling plus BenefitHub discounts on thousands of brands." },
              ].map((b) => (
                <div
                  key={b.title}
                  className="flex items-start gap-3 rounded-[14px] bg-white/[0.04] p-3.5 transition-all hover:bg-white/[0.07]"
                  style={{ boxShadow: "0 0 0 1.5px rgba(93,159,210,0.35), 0 0 28px rgba(93,159,210,0.18), 0 4px 8px rgba(0,0,0,0.25), 0 12px 28px rgba(0,0,0,0.22)" }}
                >
                  <span className="text-lg" aria-hidden="true">{b.icon}</span>
                  <div>
                    <p className="text-[0.8rem] font-semibold text-white">{b.title}</p>
                    <p className="mt-0.5 text-[0.76rem] leading-[1.55] text-white/80">{b.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[0.78rem] italic text-white/65">
              Benefits begin the first of the month following 60 days of employment.
            </p>
          </div>
        </div>

        {/* ── Scene 5: Life at AAP ── */}
        <div className="login-scene snap-start min-h-screen flex items-center relative z-[2] px-8 py-16 lg:px-16">
          <div className="w-full max-w-[560px]">
            <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-brand-sky">Life at AAP</p>
            <h2 className="text-[clamp(2.05rem,4vw,3.1rem)] font-bold leading-[1.1] text-white">
              Where good people<br />do great work.
            </h2>
            <p className="mt-4 text-[0.97rem] leading-[1.75] text-white/90">
              At AAP, you're not a number in a headcount — you're a partner. Your ideas shape how things run.
              Your feedback drives real improvement. And your growth is something we actively invest in, not just talk about.
            </p>
            <div className="mt-7 divide-y divide-white/20">
              {[
                { label: "Customer Focus", desc: "Service isn't a department — it's an attitude" },
                { label: "Integrity", desc: "We say what we mean, and mean what we say" },
                { label: "Respect", desc: "Every voice matters. Every contribution counts" },
                { label: "Excellence", desc: "We raise the bar, then raise it again" },
                { label: "Ownership", desc: "We take responsibility and own our results" },
              ].map((v) => (
                <div
                  key={v.label}
                  className="group flex items-baseline justify-between gap-6 py-4 transition-all hover:pl-1"
                >
                  <span className="text-[1.15rem] font-bold text-white transition-colors group-hover:text-brand-sky">{v.label}</span>
                  <span className="shrink-0 text-right text-[0.86rem] leading-[1.5] text-white/70 whitespace-nowrap">{v.desc}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <p className="mb-3 text-[0.88rem] text-white/75">You've seen what we're about.</p>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("portal-full-name");
                  input?.focus();
                }}
                className="inline-flex items-center gap-2 rounded-[10px] bg-brand-sky px-5 py-3 text-[0.85rem] font-bold text-brand-ink transition-all hover:brightness-110 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(93,159,210,0.35)]"
              >
                Sign in to your portal →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Right: fixed login card ── */}
      <section
        className="hidden lg:flex w-[42%] items-center justify-center bg-[#f0f3f8] px-10 py-10"
        aria-label="Portal sign in"
      >
        <div className="w-full max-w-[420px]">
          {/* Card */}
          <div
            className="overflow-hidden rounded-[24px] bg-white animate-fade-up-slow"
            style={{
              boxShadow:
                "0 1px 1px rgba(0,0,0,0.03), 0 4px 8px rgba(0,0,0,0.05), 0 20px 40px rgba(18,33,56,0.10), 0 48px 96px rgba(18,33,56,0.08)",
              animationDelay: "150ms",
            }}
          >
            {/* Gradient stripe */}
            <div className="h-1.5 bg-gradient-to-r from-brand-deep via-brand-action to-accent" />

            {/* Card body */}
            <div className="px-9 py-9">
              <h2 className="text-[1.5rem] font-bold tracking-[-0.02em] text-text-primary">
                Let&apos;s get you in.
              </h2>
              <p className="mt-2 text-[0.84rem] leading-[1.65] text-text-secondary">
                Enter your name and employee number to jump into your portal.
              </p>

              <div className="mt-7">
                <LoginForm />
              </div>

              <p className="mt-5 text-center text-[0.7rem] text-text-muted">
                Your employee number is in BambooHR under My Info.
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[0.65rem] text-[#9ca3af]">
            © 2026 AAP — All rights reserved
          </p>
        </div>
      </section>

      {/* ── Mobile: single column login ── */}
      <div className="flex lg:hidden w-full flex-col items-center justify-center min-h-screen px-6 py-12 bg-brand-ink">
        <Image src="/logo.png" alt="AAP | API logos" width={180} height={45} className="mb-8 h-10 w-auto" priority />
        <div
          className="w-full max-w-[420px] overflow-hidden rounded-[24px] bg-white"
          style={{
            boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div className="h-1.5 bg-gradient-to-r from-brand-deep via-brand-action to-accent" />
          <div className="px-7 py-8">
            <h2 className="text-[1.4rem] font-bold text-text-primary">Let&apos;s get you in.</h2>
            <p className="mt-1.5 text-[0.83rem] text-text-secondary">Enter your name and employee number.</p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
