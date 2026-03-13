"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

// ── Static data ───────────────────────────────────────────────────────────────

const SCENE_LABELS = ["Welcome", "What's Inside", "About AAP", "Benefits", "Culture"];

/** Nav tiles on the hero scene — each jumps to a numbered scene (0-indexed). */
const NAV_TILES = [
  { sceneIdx: 1, label: "What's Inside" },
  { sceneIdx: 2, label: "About AAP"     },
  { sceneIdx: 3, label: "Your Benefits" },
  { sceneIdx: 4, label: "Life at AAP"   },
];

/** Module preview cards for Scene 2. */
const MODULE_PREVIEWS = [
  { icon: "🏢", title: "Welcome to AAP",     desc: "History, mission, and what we stand for" },
  { icon: "🤝", title: "How We Show Up",     desc: "Culture, values, and expectations"        },
  { icon: "🔧", title: "Tools & Systems",    desc: "What you'll actually use day to day"      },
  { icon: "🛡️", title: "Safety at AAP",      desc: "Policies that protect everyone"           },
];

/** Benefit cards — no specific pricing figures. */
const BENEFITS = [
  {
    icon: "🏥",
    title: "Medical",
    detail: "BlueCross BlueShield of Alabama — choose PPO or HDHP with HSA option",
  },
  {
    icon: "💰",
    title: "401(k)",
    detail: "Company matching contributions to help you build long-term savings",
  },
  {
    icon: "😁",
    title: "Dental + Vision",
    detail: "Guardian plans — preventive dental and vision care covered",
  },
  {
    icon: "🛡️",
    title: "Life & AD&D",
    detail: "Company-paid basic life insurance and accidental death coverage",
  },
  {
    icon: "📱",
    title: "Teladoc",
    detail: "24/7 telehealth for you and your household, at no cost to you",
  },
  {
    icon: "💬",
    title: "EAP + Perks",
    detail: "Life Matters counseling services and BenefitHub discount marketplace",
  },
];

/** Company values for Scene 5. */
const VALUES = [
  { label: "Member First",  desc: "Every decision starts with what's right for our members"   },
  { label: "Integrity",     desc: "We do what we say — every time, without exception"           },
  { label: "Teamwork",      desc: "Collective wins over individual glory"                        },
  { label: "Innovation",    desc: "Always asking: is there a better way?"                        },
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "linear-gradient(155deg, #091e38 0%, #051730 45%, #081b38 100%)",
  surface:   "rgba(255,255,255,0.04)",
  surfaceHv: "rgba(255,255,255,0.07)",
  border:    "rgba(255,255,255,0.08)",
  cyan:      "#3dd8f8",
  cyanAlpha: "rgba(61,216,248,0.15)",
  white60:   "rgba(255,255,255,0.6)",
  white40:   "rgba(255,255,255,0.4)",
  white20:   "rgba(255,255,255,0.2)",
  white10:   "rgba(255,255,255,0.10)",
  font:      '"Manrope", "Plus Jakarta Sans", system-ui, sans-serif',
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Pill badge used in several scenes. */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        alignItems: "center",
        padding: "0.2rem 0.65rem",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: C.cyanAlpha,
        color: C.cyan,
        border: `1px solid rgba(61,216,248,0.25)`,
      }}
    >
      {children}
    </span>
  );
}

// ── Scene 1 — Hero ────────────────────────────────────────────────────────────
function Scene1Hero({ onNavClick }: { onNavClick: (idx: number) => void }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "3rem 2.5rem 2.5rem",
        textAlign: "center",
      }}
    >
      {/* Logo + eyebrow */}
      <div>
        <Image
          src="/logo.png"
          alt="AAP Logo"
          width={140}
          height={48}
          style={{ objectFit: "contain" }}
          priority
        />
        <p
          style={{
            margin: "0.8rem 0 0",
            fontSize: "0.625rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: C.cyan,
          }}
        >
          Welcome Aboard.
        </p>
      </div>

      {/* Main headline */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontFamily: C.font, lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 1.125rem" }}>
          <span style={{ display: "block", fontSize: "clamp(2.25rem, 3.8vw, 3.25rem)", fontWeight: 800, color: "#fff" }}>
            Ready for day one?
          </span>
          <span style={{ display: "block", fontSize: "clamp(2.25rem, 3.8vw, 3.25rem)", fontWeight: 800, color: C.cyan }}>
            You are now.
          </span>
        </h1>
        <p style={{ color: "rgba(255,255,255,0.84)", fontSize: "1.1875rem", fontWeight: 600, lineHeight: 1.45, margin: "0 0 0.375rem" }}>
          A smoother start begins here.
        </p>
        <p style={{ color: "rgba(255,255,255,0.74)", fontSize: "1.125rem", fontWeight: 500, lineHeight: 1.45, margin: 0 }}>
          Because day one already has enough surprises.
        </p>
      </div>

      {/* Chapter nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%", maxWidth: "22rem" }}>
        {NAV_TILES.map((tile) => (
          <button
            key={tile.label}
            onClick={() => onNavClick(tile.sceneIdx)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.55rem 1rem",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "8px",
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHv;
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(61,216,248,0.25)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.surface;
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
            }}
          >
            <span>{tile.label}</span>
            <span style={{ color: C.cyan, fontSize: "0.8rem", opacity: 0.8, lineHeight: 1 }}>↓</span>
          </button>
        ))}
      </div>

      {/* Copyright */}
      <p style={{ margin: "1.25rem 0 0", color: C.white20, fontSize: "0.65rem", letterSpacing: "0.03em" }}>
        © 2026 AAP — All rights reserved.
      </p>
    </div>
  );
}

// ── Scene 2 — What's Inside ───────────────────────────────────────────────────
function Scene2WhatsInside() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem 3rem 3rem 3.5rem",
      }}
    >
      <Pill>The Journey</Pill>
      <h2
        style={{
          fontFamily: C.font,
          fontSize: "clamp(1.75rem, 2.8vw, 2.25rem)",
          fontWeight: 800,
          color: "#fff",
          lineHeight: 1.15,
          letterSpacing: "-0.025em",
          margin: "0.875rem 0 0.5rem",
        }}
      >
        What's Inside
      </h2>
      <p style={{ color: C.white60, fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "26rem", marginBottom: "2rem" }}>
        A guided path through everything you need to know before your first shift.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {MODULE_PREVIEWS.map((m) => (
          <div
            key={m.title}
            style={{
              padding: "1rem 1.125rem",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.375rem" }}>{m.icon}</div>
            <div style={{ fontFamily: C.font, fontWeight: 700, color: "#fff", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              {m.title}
            </div>
            <div style={{ color: C.white40, fontSize: "0.75rem", lineHeight: 1.5 }}>{m.desc}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "1.5rem",
          padding: "0.875rem 1.125rem",
          background: C.surface,
          border: `1px solid rgba(61,216,248,0.15)`,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>🎯</span>
        <div>
          <div style={{ fontFamily: C.font, fontWeight: 700, color: "#fff", fontSize: "0.8125rem" }}>Track-Specific Content</div>
          <div style={{ color: C.white40, fontSize: "0.75rem", marginTop: "0.15rem" }}>
            Your modules are tailored to your role — HR, Warehouse, or Administrative.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scene 3 — About AAP ───────────────────────────────────────────────────────
function Scene3About() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem 3rem 3rem 3.5rem",
      }}
    >
      <Pill>Our Story</Pill>
      <h2
        style={{
          fontFamily: C.font,
          fontSize: "clamp(1.75rem, 2.8vw, 2.25rem)",
          fontWeight: 800,
          color: "#fff",
          lineHeight: 1.15,
          letterSpacing: "-0.025em",
          margin: "0.875rem 0 0.5rem",
        }}
      >
        Powering independent
        <br />
        pharmacies across America.
      </h2>
      <p style={{ color: C.white60, fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "26rem", marginBottom: "2rem" }}>
        We're a member-owned cooperative headquartered right here in Scottsboro,
        Alabama — serving independent pharmacies nationwide since 2009.
      </p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
        {[
          { stat: "2,100+", label: "Member Pharmacies" },
          { stat: "2009",   label: "Founded"           },
          { stat: "AL",     label: "Headquartered"     },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "1rem",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: C.font,
                fontWeight: 800,
                fontSize: "1.5rem",
                color: C.cyan,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                marginBottom: "0.375rem",
              }}
            >
              {s.stat}
            </div>
            <div style={{ color: C.white40, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Mission quote */}
      <blockquote
        style={{
          margin: 0,
          padding: "1.125rem 1.25rem",
          borderLeft: `3px solid ${C.cyan}`,
          background: C.surface,
          borderRadius: "0 10px 10px 0",
        }}
      >
        <p
          style={{
            fontFamily: C.font,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9375rem",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          "To provide independent pharmacies with the products, programs, and support they need to compete and thrive."
        </p>
      </blockquote>
    </div>
  );
}

// ── Scene 4 — Benefits ────────────────────────────────────────────────────────
function Scene4Benefits() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem 3rem 3rem 3.5rem",
      }}
    >
      <Pill>Day One Coverage</Pill>
      <h2
        style={{
          fontFamily: C.font,
          fontSize: "clamp(1.75rem, 2.8vw, 2.25rem)",
          fontWeight: 800,
          color: "#fff",
          lineHeight: 1.15,
          letterSpacing: "-0.025em",
          margin: "0.875rem 0 0.5rem",
        }}
      >
        You're covered.
        <br />
        Seriously covered.
      </h2>
      <p style={{ color: C.white60, fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "26rem", marginBottom: "1.5rem" }}>
        Benefits that show up for you the same way you show up for the work.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            style={{
              padding: "0.875rem 1rem",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.125rem" }}>{b.icon}</span>
              <span style={{ fontFamily: C.font, fontWeight: 700, color: "#fff", fontSize: "0.8125rem" }}>{b.title}</span>
            </div>
            <p style={{ margin: 0, color: C.white40, fontSize: "0.7rem", lineHeight: 1.5 }}>{b.detail}</p>
          </div>
        ))}
      </div>

      <p style={{ color: C.white20, fontSize: "0.7rem", marginTop: "1rem", marginBottom: 0 }}>
        Full details available in your benefits packet and inside the onboarding portal.
      </p>
    </div>
  );
}

// ── Scene 5 — Culture / Values ────────────────────────────────────────────────
function Scene5Values({ onCta }: { onCta?: () => void }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem 3rem 3rem 3.5rem",
      }}
    >
      <Pill>Our Culture</Pill>
      <h2
        style={{
          fontFamily: C.font,
          fontSize: "clamp(1.75rem, 2.8vw, 2.25rem)",
          fontWeight: 800,
          color: "#fff",
          lineHeight: 1.15,
          letterSpacing: "-0.025em",
          margin: "0.875rem 0 0.5rem",
        }}
      >
        Where good people
        <br />
        do great work.
      </h2>
      <p style={{ color: C.white60, fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "26rem", marginBottom: "1.75rem" }}>
        A workplace built on integrity, teamwork, and doing right by the people
        we serve — every single day.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "2rem" }}>
        {VALUES.map((v, i) => (
          <div
            key={v.label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.875rem",
              padding: "0.75rem 1rem",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: "1.5rem",
                height: "1.5rem",
                borderRadius: "50%",
                background: C.cyanAlpha,
                border: `1px solid rgba(61,216,248,0.25)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.65rem",
                fontWeight: 700,
                color: C.cyan,
                marginTop: "0.1rem",
              }}
            >
              {i + 1}
            </div>
            <div>
              <div style={{ fontFamily: C.font, fontWeight: 700, color: "#fff", fontSize: "0.875rem" }}>{v.label}</div>
              <div style={{ color: C.white40, fontSize: "0.75rem", marginTop: "0.15rem", lineHeight: 1.5 }}>{v.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onCta}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.875rem 1.5rem",
          background: "linear-gradient(135deg, #22d4f5 0%, #0ea5e9 100%)",
          color: "#051730",
          fontFamily: C.font,
          fontWeight: 700,
          fontSize: "0.9375rem",
          borderRadius: "10px",
          border: "none",
          cursor: "pointer",
          width: "100%",
          transition: "opacity 0.15s ease",
          letterSpacing: "-0.01em",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        Sign In to Get Started →
      </button>
    </div>
  );
}

// ── Progress Dots ─────────────────────────────────────────────────────────────
function ProgressDots({
  active,
  count,
  onDotClick,
}: {
  active: number;
  count: number;
  onDotClick: (idx: number) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        right: "1.125rem",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.4rem",
        zIndex: 30,
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <button
          key={idx}
          onClick={() => onDotClick(idx)}
          aria-label={`Go to ${SCENE_LABELS[idx]}`}
          title={SCENE_LABELS[idx]}
          style={{
            width: "5px",
            height: active === idx ? "22px" : "5px",
            borderRadius: "3px",
            background: active === idx ? C.cyan : "rgba(255,255,255,0.25)",
            border: "none",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
            transition: "height 0.3s ease, background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface ScenePanelProps {
  onCtaClick?: () => void;
}

export function ScenePanel({ onCtaClick }: ScenePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Track active scene via IntersectionObserver
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const observers: IntersectionObserver[] = [];

    sceneRefs.current.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIdx(idx);
        },
        { threshold: 0.5, root }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Scroll a scene into view
  const scrollTo = useCallback((idx: number) => {
    sceneRefs.current[idx]?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: C.bg }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            // Upper-left corner: lighter steel blue lifting the heaviness
            "radial-gradient(ellipse 100% 60% at -5% -5%, rgba(100,170,255,0.18) 0%, rgba(61,130,220,0.10) 30%, transparent 60%), " +
            // Soft cyan shimmer mid-left
            "radial-gradient(ellipse 60% 40% at 25% 30%, rgba(61,216,248,0.07) 0%, transparent 55%), " +
            // Dark anchor at bottom-right for depth
            "radial-gradient(ellipse 70% 60% at 90% 100%, rgba(5,15,30,0.6) 0%, transparent 60%)",
          zIndex: 1,
        }}
      />

      {/* Progress dots */}
      <ProgressDots active={activeIdx} count={5} onDotClick={scrollTo} />

      {/* Scroll-snap container */}
      <div
        ref={scrollRef}
        className="absolute inset-0"
        style={{
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          zIndex: 2,
        }}
      >
        {/* Scene 1 */}
        <div
          ref={(el) => { sceneRefs.current[0] = el; }}
          style={{ height: "100vh", scrollSnapAlign: "start" }}
        >
          <Scene1Hero onNavClick={scrollTo} />
        </div>

        {/* Scene 2 */}
        <div
          ref={(el) => { sceneRefs.current[1] = el; }}
          style={{ height: "100vh", scrollSnapAlign: "start" }}
        >
          <Scene2WhatsInside />
        </div>

        {/* Scene 3 */}
        <div
          ref={(el) => { sceneRefs.current[2] = el; }}
          style={{ height: "100vh", scrollSnapAlign: "start" }}
        >
          <Scene3About />
        </div>

        {/* Scene 4 */}
        <div
          ref={(el) => { sceneRefs.current[3] = el; }}
          style={{ height: "100vh", scrollSnapAlign: "start" }}
        >
          <Scene4Benefits />
        </div>

        {/* Scene 5 */}
        <div
          ref={(el) => { sceneRefs.current[4] = el; }}
          style={{ height: "100vh", scrollSnapAlign: "start" }}
        >
          <Scene5Values onCta={onCtaClick} />
        </div>
      </div>
    </div>
  );
}
