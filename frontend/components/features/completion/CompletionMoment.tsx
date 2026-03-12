"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/layout/PageContainer";

interface CompletionMomentProps {
  moduleTitle: string;
  isLastModule?: boolean;
}

const CONFETTI_COLORS = ["#3077b9", "#2e3d8f", "#1f8f54", "#8ea3c1", "#df002a"];

function Particle({ x, color, delay }: { x: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute top-0 h-2 w-2 rounded-full"
      style={{ left: `${x}%`, backgroundColor: color }}
      initial={{ y: -10, opacity: 1, rotate: 0 }}
      animate={{ y: 100, opacity: 0, rotate: 360 }}
      transition={{ duration: 1.4, delay, ease: "easeIn" }}
    />
  );
}

export function CompletionMoment({ moduleTitle, isLastModule = false }: CompletionMomentProps) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const particles = Array.from({ length: 10 }, (_, index) => ({
    x: 10 + index * 8,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: index * 0.07,
  }));

  return (
    <PageContainer size="narrow">
      <div className="flex justify-center py-6 md:py-10">
        <div className="relative w-full max-w-3xl">
          <AnimatePresence>
            {show && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
                {particles.map((particle, index) => <Particle key={index} {...particle} />)}
              </div>
            )}
          </AnimatePresence>

          <motion.div
            className="premium-panel rounded-[36px] px-8 py-10 text-center md:px-12"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative z-10 space-y-6">
              <motion.div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-success/20 bg-success-surface"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
              >
                <svg className="h-10 w-10 text-success" viewBox="0 0 24 20" fill="none" aria-hidden>
                  <motion.path
                    d="M2 10l7 7L22 2"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>

              <motion.div className="space-y-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-success">Module complete</p>
                <h2 className="text-h1 font-display text-brand-ink">{moduleTitle}</h2>
                <p className="mx-auto max-w-xl text-ui text-text-secondary">
                  {isLastModule
                    ? "That completes every published module on your path. Welcome to AAP."
                    : "Well done. Your progress is saved and you are ready for the next part of onboarding whenever you are."}
                </p>
              </motion.div>

              <motion.div className="pt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <Button size="lg" onClick={() => router.push("/overview")}>
                  Return to my path
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageContainer>
  );
}