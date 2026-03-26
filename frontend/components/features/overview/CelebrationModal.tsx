"use client";

import { useMemo, useState } from "react";
import { generateCertificate } from "@/lib/generateCertificate";

interface CelebrationModalProps {
  name: string;
  completedCount: number;
  onClose: () => void;
}

interface Spark {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
}

function buildSparks(): Spark[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: 10 + (i * 7.5) % 82,
    size: i % 3 === 0 ? 7 : 5,
    delay: (i % 6) * 0.15,
    duration: 2.4 + (i % 4) * 0.25,
  }));
}

export function CelebrationModal({ name, completedCount, onClose }: CelebrationModalProps) {
  const firstName = name.split(" ")[0] ?? name;
  const sparks = useMemo(() => buildSparks(), []);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    try {
      generateCertificate(name, completedCount);
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  return (
    <>
      <style>{`
        @keyframes celebration-in {
          0% { opacity: 0; transform: translateY(10px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spark-float {
          0% { transform: translateY(8px); opacity: 0; }
          25% { opacity: 0.8; }
          100% { transform: translateY(-16px); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(15, 32, 58, 0.58)", backdropFilter: "blur(5px)" }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-[#c2daf1] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] shadow-[0_24px_56px_rgba(9,20,41,0.24)]"
          style={{ animation: "celebration-in 260ms ease-out both" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 w-full bg-[linear-gradient(90deg,#0f7fb3_0%,#06b6d4_52%,#df0030_100%)]" />

          {sparks.map((spark) => (
            <span
              key={spark.id}
              className="pointer-events-none absolute top-[76px] rounded-full"
              style={{
                left: `${spark.left}%`,
                width: `${spark.size}px`,
                height: `${spark.size}px`,
                backgroundColor: "rgba(14,165,233,0.34)",
                animation: `spark-float ${spark.duration}s ${spark.delay}s ease-out infinite`,
              }}
            />
          ))}

          <div className="px-8 pb-8 pt-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#9dd2ef] bg-[#eaf6ff] text-[#0f6da3]">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 12.5 9.5 18 20 6" />
              </svg>
            </div>

            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#0f6da3]">AAP Start complete</p>
            <h2 className="mt-2 text-[1.86rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#0f1d3c]">
              Journey complete, {firstName}.
            </h2>

            <p className="mt-3 text-[0.88rem] leading-[1.68] text-[#445b78]">
              You finished every published onboarding module. That is a strong start and a meaningful milestone.
            </p>

            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[14px] border border-[#cde0f3] bg-[#f7fbff]">
              <div className="px-4 py-3">
                <p className="text-[1.4rem] font-extrabold text-[#0f6da3]">{completedCount}</p>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#5d7391]">Modules complete</p>
              </div>
              <div className="border-l border-[#cde0f3] px-4 py-3">
                <p className="text-[1.4rem] font-extrabold text-[#0f6da3]">100%</p>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#5d7391]">Progress</p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#cde0f3] bg-white py-3 text-[0.9rem] font-bold text-[#184371] transition-all duration-200 hover:-translate-y-px hover:border-[#6eaeea] hover:shadow-[0_6px_14px_rgba(15,127,179,0.12)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloading ? "Downloading..." : "Download Certificate"}
            </button>

            <button
              onClick={onClose}
              className="mt-3 w-full rounded-[12px] border border-[#6eaeea] bg-[linear-gradient(135deg,#184371_0%,#13629a_100%)] py-3 text-[0.9rem] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_18px_rgba(15,127,179,0.24)]"
            >
              Return to overview
            </button>

            <p className="mt-3 text-[0.7rem] text-[#607896]">You can revisit any module anytime.</p>
          </div>
        </div>
      </div>
    </>
  );
}
