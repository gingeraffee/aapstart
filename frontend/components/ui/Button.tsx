"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] text-white shadow-[0_18px_36px_rgba(36,54,115,0.22)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(36,54,115,0.26)] active:translate-y-0",
  secondary:
    "border border-white/80 bg-white/90 text-text-primary shadow-sm hover:bg-white hover:-translate-y-0.5",
  ghost:
    "bg-transparent text-text-secondary hover:bg-slate-950/[0.04] hover:text-text-primary",
  destructive:
    "bg-[linear-gradient(135deg,#df002a_0%,#b50b2f_100%)] text-white shadow-[0_18px_36px_rgba(223,0,42,0.18)] hover:-translate-y-0.5",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-caption rounded-full gap-1.5",
  md: "h-11 px-5 text-ui rounded-full gap-2",
  lg: "h-[3.25rem] px-7 text-ui rounded-full gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-action focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "select-none whitespace-nowrap",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="-ml-0.5 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";