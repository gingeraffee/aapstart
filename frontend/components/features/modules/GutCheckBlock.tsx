"use client";

import { useState } from "react";

interface GutCheckScenario {
  scenario: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

interface GutCheckBlockProps {
  scenarios: GutCheckScenario[];
}

export function GutCheckBlock({ scenarios }: GutCheckBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const current = scenarios[currentIndex];
  const isCorrect = selected === current.correctId;
  const isLast = currentIndex === scenarios.length - 1;

  function handleSelect(id: string) {
    if (revealed) return;
    setSelected(id);
  }

  function handleReveal() {
    setRevealed(true);
  }

  function handleNext() {
    setSelected(null);
    setRevealed(false);
    setCurrentIndex((prev) => Math.min(prev + 1, scenarios.length - 1));
  }

  return (
    <div
      className="overflow-hidden rounded-[16px]"
      style={{
        border: "1px solid rgba(27, 44, 86, 0.14)",
        background:
          "linear-gradient(180deg, rgba(15, 127, 179, 0.03) 0%, rgba(15, 127, 179, 0.008) 100%)",
        boxShadow: "0 8px 20px rgba(12, 24, 47, 0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderBottom: "1px solid rgba(27, 44, 86, 0.10)",
          background: "rgba(15, 127, 179, 0.05)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[8px]"
            style={{ background: "rgba(15, 127, 179, 0.12)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#0e76bd"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M6 6.5a2 2 0 1 1 2.5 1.94V10" />
              <circle cx="8" cy="12.5" r="0.5" fill="#0e76bd" stroke="none" />
            </svg>
          </span>
          <span
            className="text-[0.7rem] font-bold uppercase tracking-[0.13em]"
            style={{ color: "#0e76bd" }}
          >
            Gut Check
          </span>
        </div>
        <span
          className="text-[0.72rem] font-medium tabular-nums"
          style={{ color: "#607896" }}
        >
          {currentIndex + 1} of {scenarios.length}
        </span>
      </div>

      {/* Scenario */}
      <div className="px-5 py-4">
        <p
          className="text-[0.92rem] font-semibold leading-[1.52] tracking-[-0.01em]"
          style={{ color: "#112744" }}
        >
          {current.scenario}
        </p>

        {/* Options */}
        <div className="mt-4 space-y-2">
          {current.options.map((option) => {
            const isThis = selected === option.id;
            const isAnswer = option.id === current.correctId;

            let borderColor = "rgba(143, 171, 205, 0.34)";
            let bg =
              "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,252,255,0.9) 100%)";
            let textColor = "#284565";

            if (revealed && isAnswer) {
              borderColor = "rgba(34, 197, 94, 0.5)";
              bg = "rgba(34, 197, 94, 0.08)";
              textColor = "#166534";
            } else if (revealed && isThis && !isCorrect) {
              borderColor = "rgba(223, 0, 48, 0.35)";
              bg = "rgba(223, 0, 48, 0.05)";
              textColor = "#9f1239";
            } else if (isThis && !revealed) {
              borderColor = "rgba(14, 127, 179, 0.5)";
              bg = "rgba(14, 127, 179, 0.08)";
              textColor = "#0c5a82";
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                disabled={revealed}
                className="flex w-full items-start gap-3 rounded-[12px] border px-4 py-3 text-left transition-all duration-200"
                style={{
                  borderColor,
                  background: bg,
                  cursor: revealed ? "default" : "pointer",
                }}
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.6rem] font-bold"
                  style={{
                    borderColor:
                      revealed && isAnswer
                        ? "#22c55e"
                        : revealed && isThis && !isCorrect
                          ? "#df0030"
                          : isThis
                            ? "#0f7fb3"
                            : "#adc5e2",
                    backgroundColor:
                      revealed && isAnswer
                        ? "#22c55e"
                        : revealed && isThis && !isCorrect
                          ? "#df0030"
                          : isThis
                            ? "#0f7fb3"
                            : "white",
                    color:
                      isThis || (revealed && (isAnswer || (isThis && !isCorrect)))
                        ? "white"
                        : "#6a86a5",
                  }}
                >
                  {revealed && isAnswer
                    ? "✓"
                    : revealed && isThis && !isCorrect
                      ? "✗"
                      : option.id.toUpperCase()}
                </span>
                <span
                  className="text-[0.84rem] leading-[1.55]"
                  style={{ color: textColor }}
                >
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reveal / Explanation */}
        {selected && !revealed && (
          <button
            onClick={handleReveal}
            className="mt-4 w-full rounded-[10px] border border-[rgba(14,127,179,0.3)] bg-[rgba(14,127,179,0.06)] py-2.5 text-[0.82rem] font-semibold transition-all duration-200 hover:bg-[rgba(14,127,179,0.12)]"
            style={{ color: "#0e76bd" }}
          >
            Check my answer
          </button>
        )}

        {revealed && (
          <div
            className="mt-4 rounded-[12px] px-4 py-3"
            style={{
              background: isCorrect
                ? "rgba(34, 197, 94, 0.06)"
                : "rgba(223, 0, 48, 0.04)",
              border: isCorrect
                ? "1px solid rgba(34, 197, 94, 0.2)"
                : "1px solid rgba(223, 0, 48, 0.15)",
            }}
          >
            <p
              className="text-[0.72rem] font-bold uppercase tracking-[0.1em]"
              style={{ color: isCorrect ? "#16a34a" : "#b91c1c" }}
            >
              {isCorrect ? "Nice — you got it." : "Not quite."}
            </p>
            <p
              className="mt-1.5 text-[0.82rem] leading-[1.6]"
              style={{ color: "#425d7d" }}
            >
              {current.explanation}
            </p>

            {!isLast && (
              <button
                onClick={handleNext}
                className="mt-3 rounded-[8px] bg-[#17365d] px-4 py-2 text-[0.78rem] font-semibold text-white transition-all duration-200 hover:bg-[#1e4577]"
              >
                Next scenario →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
