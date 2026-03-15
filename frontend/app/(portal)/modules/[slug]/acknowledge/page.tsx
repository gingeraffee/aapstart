"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { ChecklistItem } from "@/components/ui/ChecklistItem";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleDetail } from "@/lib/types";

export default function AcknowledgePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: module, isLoading } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !module) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentModule = module;
  const allChecked = currentModule.acknowledgements.every((item) => checked[item.id]);

  const steps = [
    { key: "read", label: "Read" },
    ...(currentModule.requires_acknowledgement ? [{ key: "confirm", label: "Confirm" }] : []),
    ...(currentModule.requires_quiz ? [{ key: "quiz", label: "Quiz" }] : []),
  ];

  async function handleSubmit() {
    if (!allChecked) return;
    setSubmitting(true);
    setError(null);

    try {
      await progressApi.acknowledge(slug, currentModule.acknowledgements.map((item) => item.id));

      if (currentModule.requires_quiz) {
        router.push(`/modules/${slug}/quiz`);
      } else {
        router.push(`/modules/${slug}/complete`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8 animate-fade-up">
      <div className="mx-auto max-w-[860px] space-y-5">

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-text-muted">
          <Link href="/overview" className="hover:text-text-primary transition-colors">My Path</Link>
          <span>/</span>
          <Link href={`/modules/${slug}`} className="hover:text-text-primary transition-colors">{currentModule.title}</Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Confirmation</span>
        </div>

        {/* Module header card */}
        <div
          className="relative overflow-hidden rounded-[20px]"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f2f8ff 100%)",
            boxShadow: "0 4px 24px rgba(14,118,189,0.13), 0 1px 6px rgba(0,0,0,0.07)",
            border: "1px solid rgba(14,118,189,0.16)",
          }}
        >
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, #0e76bd 0%, #5d9fd2 60%, #22c55e 100%)" }}
          />
          <div className="px-7 pt-5 pb-6">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ color: "#0e76bd" }}>
              Module {String(currentModule.order).padStart(2, "0")} · Confirmation
            </p>
            <h1 className="mt-1.5 text-[clamp(1.4rem,2.5vw,1.8rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-text-primary">
              Confirm the key expectations from this module.
            </h1>
            <p className="mt-2 max-w-[600px] text-[0.88rem] leading-[1.65] text-text-secondary">
              Review each statement below and confirm every item you understand before moving to the next step.
            </p>
            {/* Step path */}
            <div className="mt-4 flex items-center gap-1.5">
              {steps.map((step, i) => (
                <div key={step.key} className="flex items-center gap-1.5">
                  <div
                    className="flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[0.62rem] font-bold uppercase tracking-[0.06em]"
                    style={
                      step.key === "confirm"
                        ? { backgroundColor: "#0e76bd", color: "#fff" }
                        : step.key === "read"
                          ? { backgroundColor: "rgba(34,197,94,0.15)", color: "#16a34a" }
                          : { backgroundColor: "rgba(14,118,189,0.1)", color: "#0e76bd" }
                    }
                  >
                    <span
                      className="flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full text-[0.48rem] font-black"
                      style={
                        step.key === "confirm"
                          ? { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff" }
                          : step.key === "read"
                            ? { backgroundColor: "rgba(34,197,94,0.3)", color: "#16a34a" }
                            : { backgroundColor: "rgba(14,118,189,0.2)", color: "#0e76bd" }
                      }
                    >
                      {step.key === "read" ? "✓" : i + 1}
                    </span>
                    {step.label}
                  </div>
                  {i < steps.length - 1 && (
                    <span style={{ color: "rgba(14,118,189,0.3)", fontSize: "0.7rem" }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Module recap card */}
        <div
          className="rounded-[14px] px-6 py-4"
          style={{ backgroundColor: "rgba(14,118,189,0.04)", border: "1px solid rgba(14,118,189,0.12)" }}
        >
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "#0e76bd" }}>
            You completed reading
          </p>
          <p className="mt-1 text-[0.93rem] font-semibold text-text-primary">{currentModule.title}</p>
          {currentModule.description && (
            <p className="mt-1 text-[0.82rem] text-text-secondary">{currentModule.description}</p>
          )}
        </div>

        {/* Checklist card */}
        <div
          className="rounded-[16px] bg-white"
          style={{ border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="px-6 py-5">
            <p className="mb-4 text-[0.78rem] font-bold text-text-primary">
              Check off each statement to confirm your understanding:
            </p>
            <div className="space-y-3">
              {currentModule.acknowledgements.map((ack) => (
                <ChecklistItem
                  key={ack.id}
                  label={ack.statement}
                  checked={checked[ack.id] ?? false}
                  onChange={(value) => setChecked((prev) => ({ ...prev, [ack.id]: value }))}
                  className="border border-border/70 bg-gray-50/50"
                />
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-[0.88rem] text-brand-alert">{error}</p>}

        {/* Footer actions */}
        <div
          className="flex flex-col gap-3 rounded-[14px] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: "#f4f7fb", border: "1px solid #e5e7eb" }}
        >
          <Link
            href={`/modules/${slug}`}
            className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Back to module
          </Link>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleSubmit}
              disabled={!allChecked || submitting}
              className="inline-flex items-center gap-2 rounded-button px-7 text-[0.88rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                height: "2.875rem",
                background: "linear-gradient(135deg, #0e76bd 0%, #5d9fd2 100%)",
                opacity: !allChecked || submitting ? undefined : 0.82,
                boxShadow: "0 4px 14px rgba(14,118,189,0.35), 0 1px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
              onMouseEnter={(e) => {
                if ((e.currentTarget as HTMLButtonElement).disabled) return;
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(14,118,189,0.45), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                if ((e.currentTarget as HTMLButtonElement).disabled) return;
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.82";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(14,118,189,0.35), 0 1px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)";
              }}
            >
              {submitting ? "Saving…" : currentModule.requires_quiz ? "Continue to quiz" : "Complete module"}
              {!submitting && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 2l5 5-5 5" />
                </svg>
              )}
            </button>
            {!allChecked && (
              <p className="text-[0.73rem] text-text-muted">Please confirm all items to continue.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
