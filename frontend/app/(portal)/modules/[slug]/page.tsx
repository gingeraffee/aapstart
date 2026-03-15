"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { plural } from "@/lib/utils";
import type { ModuleDetail } from "@/lib/types";

export default function ModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: module, isLoading, error } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );

  useEffect(() => {
    if (module && module.status === "published") {
      progressApi.visit(slug).catch(() => {});
    }
  }, [module, slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="mx-auto w-full max-w-[860px] px-6 py-10">
        <p className="text-[0.88rem] text-text-secondary">Module not found.</p>
      </div>
    );
  }

  const currentModule = module;

  const steps = [
    { key: "read", label: "Read" },
    ...(currentModule.requires_acknowledgement ? [{ key: "confirm", label: "Confirm" }] : []),
    ...(currentModule.requires_quiz ? [{ key: "quiz", label: "Quiz" }] : []),
  ];

  function handleContinue() {
    if (currentModule.requires_acknowledgement) {
      router.push(`/modules/${slug}/acknowledge`);
      return;
    }
    if (currentModule.requires_quiz) {
      router.push(`/modules/${slug}/quiz`);
      return;
    }
    router.push(`/modules/${slug}/complete`);
  }

  const continueLabel = currentModule.requires_acknowledgement
    ? "Continue to confirmation"
    : currentModule.requires_quiz
      ? "Continue to quiz"
      : "Mark complete";

  const nextStepLabel = currentModule.requires_acknowledgement
    ? "Next: Confirmation"
    : currentModule.requires_quiz
      ? "Next: Quiz"
      : "Finish";

  return (
    <div className="w-full px-6 py-6 lg:px-8 lg:py-8 animate-fade-up">
      <div className="mx-auto max-w-[860px] space-y-5">

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-text-muted">
          <Link href="/overview" className="hover:text-text-primary transition-colors">
            My Path
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">{currentModule.title}</span>
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
          {/* Top accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, #0e76bd 0%, #5d9fd2 60%, #22c55e 100%)" }}
          />
          <div className="px-7 pt-5 pb-6">
            {/* Eyebrow */}
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em]" style={{ color: "#0e76bd" }}>
              Module {String(currentModule.order).padStart(2, "0")}
            </p>
            {/* Title */}
            <h1 className="mt-1.5 text-[clamp(1.5rem,2.5vw,2rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-text-primary">
              {currentModule.title}
            </h1>
            {currentModule.description && (
              <p className="mt-2 max-w-[600px] text-[0.88rem] leading-[1.65] text-text-secondary">
                {currentModule.description}
              </p>
            )}
            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1 text-[0.72rem] font-semibold"
                style={{ backgroundColor: "rgba(14,118,189,0.08)", color: "#0e76bd" }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="6" cy="6" r="4.5" />
                  <path d="M6 3.5v2.5l1.5 1" />
                </svg>
                ~{currentModule.estimated_minutes} {plural(currentModule.estimated_minutes, "min", "mins")}
              </span>
              {/* Step path */}
              <div className="flex items-center gap-1.5">
                {steps.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-1.5">
                    <div
                      className="flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[0.62rem] font-bold uppercase tracking-[0.06em]"
                      style={
                        i === 0
                          ? { backgroundColor: "#0e76bd", color: "#fff" }
                          : { backgroundColor: "rgba(14,118,189,0.1)", color: "#0e76bd" }
                      }
                    >
                      <span
                        className="flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full text-[0.48rem] font-black"
                        style={
                          i === 0
                            ? { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff" }
                            : { backgroundColor: "rgba(14,118,189,0.2)", color: "#0e76bd" }
                        }
                      >
                        {i + 1}
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
        </div>

        {/* Content card */}
        <div
          className="rounded-[16px] bg-white"
          style={{
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}
        >
          <div className="px-8 py-8 md:px-10">
            <div className="space-y-5">
              {currentModule.content_blocks.map((block, index) => (
                <div
                  key={index}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 25}ms` }}
                >
                  <ContentBlock block={block} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex flex-col gap-3 rounded-[14px] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: "#f4f7fb", border: "1px solid #e5e7eb" }}
        >
          <Link
            href="/overview"
            className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Back to my path
          </Link>
          <button
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-button px-7 text-[0.88rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            style={{
              height: "2.875rem",
              background: "linear-gradient(135deg, #0e76bd 0%, #5d9fd2 100%)",
              opacity: 0.82,
              boxShadow: "0 4px 14px rgba(14,118,189,0.35), 0 1px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(14,118,189,0.45), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.82";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(14,118,189,0.35), 0 1px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)";
            }}
          >
            {continueLabel}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 2l5 5-5 5" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
