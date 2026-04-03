"use client";

import { useRef, useEffect, useCallback } from "react";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function PinInput({ value, onChange, length = 6, autoFocus = true, disabled = false }: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const focusInput = useCallback((index: number) => {
    const target = inputRefs.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  }, []);

  function handleChange(index: number, digit: string) {
    // Only allow digits
    const clean = digit.replace(/\D/g, "");
    if (!clean) return;

    // Handle paste of full code
    if (clean.length > 1) {
      const pasted = clean.slice(0, length);
      onChange(pasted);
      const nextFocus = Math.min(pasted.length, length - 1);
      setTimeout(() => focusInput(nextFocus), 0);
      return;
    }

    const chars = value.split("");
    chars[index] = clean[0];
    const newValue = chars.join("").slice(0, length);
    onChange(newValue);

    // Auto-advance to next input
    if (index < length - 1) {
      setTimeout(() => focusInput(index + 1), 0);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = value.split("");
      if (chars[index]) {
        chars[index] = "";
        onChange(chars.join(""));
      } else if (index > 0) {
        chars[index - 1] = "";
        onChange(chars.join(""));
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      const nextFocus = Math.min(pasted.length, length - 1);
      setTimeout(() => focusInput(nextFocus), 0);
    }
  }

  return (
    <div className="flex justify-center gap-2.5">
      {Array.from({ length }).map((_, i) => {
        const filled = !!value[i];
        const isActive = i === value.length || (i === length - 1 && value.length === length);
        return (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={length} // allow paste
            value={value[i] ?? ""}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className="h-[52px] w-[42px] rounded-[10px] text-center text-[1.3rem] font-mono font-bold outline-none transition-all duration-200 disabled:opacity-50"
            style={{
              background: filled ? "rgba(15, 109, 163, 0.06)" : "var(--login-input-bg)",
              border: isActive
                ? "2px solid rgba(15, 109, 163, 0.5)"
                : filled
                  ? "2px solid rgba(15, 109, 163, 0.25)"
                  : "1.5px solid var(--login-input-border)",
              color: "var(--heading-color)",
              boxShadow: isActive ? "0 0 0 3px rgba(15, 109, 163, 0.08)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}
