"use client";

import { useRef } from "react";

// ── Confetti config ──────────────────────────────────────────────────────────
const COLORS = ["#0e76bd", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];
const COUNT = 70;

type Shape = "circle" | "square" | "rect";

interface Particle {
  id: number;
  x: number;
  color: string;
  w: number;
  h: number;
  delay: number;
  duration: number;
  rotate: number;
  shape: Shape;
}

function makeParticles(): Particle[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const shape: Shape = (["circle", "square", "rect"] as Shape[])[i % 3];
    const base = 5 + (i % 7) + Math.floor(i / COUNT * 8);
    return {
      id: i,
      x: (i / COUNT) * 100 + (i % 3) * 1.3,
      color: COLORS[i % COLORS.length],
      w: shape === "rect" ? base * 2.2 : base,
      h: base,
      delay: (i % 17) * 0.18,
      duration: 2.2 + (i % 9) * 0.22,
      rotate: (i * 37) % 360,
      shape,
    };
  });
}

// ── Component ────────────────────────────────────────────────────────────────
interface CelebrationModalProps {
  name: string;
  completedCount: number;
  onClose: () => void;
}

export function CelebrationModal({ name, completedCount, onClose }: CelebrationModalProps) {
  const firstName = name.split(" ")[0] ?? name;
  const particles = useRef<Particle[]>(makeParticles());

  return (
    <>
      {/* Injected keyframes — avoids adding a new CSS file */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-16px) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(800deg); opacity: 0; }
        }
        @keyframes modal-pop {
          0%   { transform: scale(0.82) translateY(24px); opacity: 0; }
          100% { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes shimmer-bar {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes trophy-bounce {
          0%, 100% { transform: scale(1)    rotate(-3deg); }
          50%       { transform: scale(1.12) rotate(3deg);  }
        }
        @keyframes celebration-pulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(34,197,94,0.25), 0 24px 80px rgba(0,0,0,0.28); }
          50%       { box-shadow: 0 0 40px 8px rgba(34,197,94,0.12), 0 24px 80px rgba(0,0,0,0.28); }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(5,20,42,0.82)", backdropFilter: "blur(5px)" }}
        onClick={onClose}
      >
        {/* ── Confetti rain ── */}
        {particles.current.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none fixed top-0"
            style={{
              left: `${p.x}%`,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              borderRadius: p.shape === "circle" ? "50%" : "2px",
              transform: `rotate(${p.rotate}deg)`,
              animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in infinite`,
              opacity: 0,
            }}
          />
        ))}

        {/* ── Modal card ── */}
        <div
          className="relative w-full max-w-[420px] overflow-hidden rounded-[24px]"
          style={{
            background: "linear-gradient(150deg, #ffffff 0%, #f4fff8 100%)",
            animation: "modal-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both, celebration-pulse 3s 0.5s ease-in-out infinite",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Shimmer accent bar */}
          <div
            className="h-1.5 w-full"
            style={{
              background: "linear-gradient(90deg, #22c55e, #0e76bd, #22c55e, #f59e0b, #22c55e)",
              backgroundSize: "300% 100%",
              animation: "shimmer-bar 3s linear infinite",
            }}
          />

          <div className="flex flex-col items-center px-8 pb-8 pt-7 text-center">

            {/* Trophy / celebration */}
            <div
              className="mb-3 text-[3.8rem] leading-none select-none"
              style={{ animation: "trophy-bounce 1.8s ease-in-out infinite" }}
            >
              🏆
            </div>

            {/* Eyebrow */}
            <p
              className="text-[0.58rem] font-bold uppercase tracking-[0.22em]"
              style={{ color: "#16a34a" }}
            >
              AAP Start — All Clear
            </p>

            {/* Headline */}
            <h2
              className="mt-2 text-[1.95rem] font-extrabold leading-[1.08] tracking-[-0.025em]"
              style={{ color: "#0f1d3c" }}
            >
              You did it, {firstName}!
            </h2>

            {/* Sub-copy */}
            <p className="mt-3 max-w-[340px] text-[0.87rem] leading-[1.72] text-text-secondary">
              Every module. Every step. Done. You&apos;ve officially completed your AAP Start onboarding — welcome to the team, for real.
            </p>

            {/* Stats strip */}
            <div
              className="mt-5 flex w-full items-center justify-center gap-0 rounded-[14px] overflow-hidden"
              style={{ border: "1px solid rgba(34,197,94,0.22)", backgroundColor: "rgba(34,197,94,0.06)" }}
            >
              <div className="flex-1 py-4">
                <p
                  className="text-[1.75rem] font-extrabold leading-tight tabular-nums"
                  style={{ color: "#16a34a" }}
                >
                  {completedCount}
                </p>
                <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                  Modules done
                </p>
              </div>

              <div className="w-px self-stretch" style={{ backgroundColor: "rgba(34,197,94,0.18)" }} />

              <div className="flex-1 py-4">
                <p
                  className="text-[1.75rem] font-extrabold leading-tight"
                  style={{ color: "#16a34a" }}
                >
                  100%
                </p>
                <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                  Complete
                </p>
              </div>

              <div className="w-px self-stretch" style={{ backgroundColor: "rgba(34,197,94,0.18)" }} />

              <div className="flex-1 py-4">
                <p
                  className="text-[1.75rem] font-extrabold leading-tight"
                  style={{ color: "#16a34a" }}
                >
                  ✓
                </p>
                <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                  All clear
                </p>
              </div>
            </div>

            {/* Motivational quote */}
            <p
              className="mt-5 text-[0.78rem] font-semibold italic leading-[1.6]"
              style={{ color: "#0e76bd" }}
            >
              &ldquo;The journey started. That&apos;s the hardest part — and you finished it.&rdquo;
            </p>

            {/* CTA */}
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-[12px] py-3.5 text-[0.92rem] font-bold text-white transition-all duration-150 hover:-translate-y-px"
              style={{
                background: "linear-gradient(135deg, #16a34a 0%, #0e76bd 100%)",
                boxShadow: "0 4px 20px rgba(22,163,74,0.35)",
              }}
            >
              Continue 🚀
            </button>

            <p className="mt-3 text-[0.68rem] text-text-muted">
              Your progress is saved. Review any module anytime.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
