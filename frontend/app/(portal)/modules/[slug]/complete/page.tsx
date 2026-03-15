"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import type { ModuleDetail, ModuleSummary, ProgressRecord } from "@/lib/types";

export default function CompletePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: module, isLoading: loadingModule } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );
  const { data: allModules, isLoading: loadingModules } = useSWR(
    "modules",
    () => modulesApi.list() as Promise<ModuleSummary[]>
  );
  const { data: progress, isLoading: loadingProgress } = useSWR(
    "progress",
    () => progressApi.getAll() as Promise<ProgressRecord[]>
  );

  if (loadingModule || loadingModules || loadingProgress) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Figure out the next unlocked module
  const liveModules = (allModules ?? [])
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  const progressMap = new Map<string, ProgressRecord>();
  (progress ?? []).forEach((p) => progressMap.set(p.module_slug, p));

  const currentIndex = liveModules.findIndex((m) => m.slug === slug);
  const nextModule = liveModules[currentIndex + 1] ?? null;
  const allDone = liveModules.every((m) => progressMap.get(m.slug)?.module_completed);

  const moduleTitle = module?.title ?? "this module";
  const moduleOrder = module?.order ?? currentIndex + 1;

  return (
    <>
      <style>{`
        @keyframes complete-pop {
          0%   { transform: scale(0.9) translateY(16px); opacity: 0; }
          70%  { transform: scale(1.02) translateY(-4px); opacity: 1; }
          100% { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        @keyframes badge-spin {
          0%   { transform: rotate(-8deg) scale(0.8); opacity: 0; }
          60%  { transform: rotate(4deg)  scale(1.1); opacity: 1; }
          100% { transform: rotate(0deg)  scale(1);   opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .complete-card  { animation: complete-pop 0.4s cubic-bezier(0.34,1.4,0.64,1) both; }
        .complete-badge { animation: badge-spin 0.5s 0.15s cubic-bezier(0.34,1.3,0.64,1) both; }
        .shimmer-text {
          background: linear-gradient(90deg, #0e76bd 0%, #5d9fd2 40%, #0a2d52 60%, #0e76bd 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      <div className="w-full px-6 py-10 lg:px-8 lg:py-14 animate-fade-up">
        <div className="mx-auto max-w-[580px]">

          {/* Completion card */}
          <div
            className="complete-card overflow-hidden rounded-[24px]"
            style={{
              background: "linear-gradient(150deg, #ffffff 0%, #f0f7ff 100%)",
              boxShadow: "0 8px 40px rgba(14,118,189,0.18), 0 2px 12px rgba(0,0,0,0.07)",
              border: "1.5px solid rgba(14,118,189,0.28)",
            }}
          >
            {/* Shimmer accent bar */}
            <div
              className="h-1.5 w-full"
              style={{
                background: "linear-gradient(90deg, #0e76bd, #5d9fd2, #0e76bd)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.5s linear infinite",
              }}
            />

            <div className="flex flex-col items-center px-8 py-10 text-center">

              {/* Badge */}
              <div
                className="complete-badge mb-5 flex h-20 w-20 items-center justify-center rounded-full text-[2.6rem]"
                style={{
                  background: "linear-gradient(135deg, rgba(14,118,189,0.12) 0%, rgba(93,159,210,0.1) 100%)",
                  border: "2px solid rgba(14,118,189,0.25)",
                }}
              >
                ✅
              </div>

              {/* Eyebrow */}
              <p
                className="text-[0.58rem] font-bold uppercase tracking-[0.22em]"
                style={{ color: "#0e76bd" }}
              >
                Module {String(moduleOrder).padStart(2, "0")} — Complete
              </p>

              {/* Headline */}
              <h1 className="shimmer-text mt-2 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.025em]">
                You finished it!
              </h1>

              {/* Module title */}
              <p
                className="mt-1.5 text-[1rem] font-semibold leading-snug"
                style={{ color: "#374151" }}
              >
                {moduleTitle}
              </p>

              {/* Sub-copy */}
              <p className="mt-3 max-w-[380px] text-[0.86rem] leading-[1.7] text-text-secondary">
                {allDone
                  ? "That's the last one. You've completed your entire AAP Start journey — that's a real accomplishment."
                  : "One more module in the books. Your progress is saved and your next module is ready when you are."}
              </p>

              {/* Divider */}
              <div className="my-6 h-px w-full" style={{ backgroundColor: "rgba(14,118,189,0.15)" }} />

              {/* Actions */}
              <div className="flex w-full flex-col gap-3">
                {nextModule && !allDone ? (
                  <>
                    <Link
                      href={`/modules/${nextModule.slug}`}
                      className="w-full rounded-[12px] py-3.5 text-center text-[0.92rem] font-bold text-white transition-all hover:-translate-y-px"
                      style={{
                        background: "linear-gradient(135deg, #0e76bd 0%, #5d9fd2 100%)",
                        boxShadow: "0 4px 16px rgba(14,118,189,0.3)",
                      }}
                    >
                      Next: {nextModule.title} →
                    </Link>
                    <Link
                      href="/overview"
                      className="w-full rounded-[12px] py-3 text-center text-[0.85rem] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                      style={{ border: "1px solid #e5e7eb" }}
                    >
                      Back to my path
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/overview"
                    className="w-full rounded-[12px] py-3.5 text-center text-[0.92rem] font-bold text-white transition-all hover:-translate-y-px"
                    style={{
                      background: "linear-gradient(135deg, #0e76bd 0%, #5d9fd2 100%)",
                      boxShadow: "0 4px 16px rgba(14,118,189,0.3)",
                    }}
                  >
                    {allDone ? "See your full journey 🏆" : "Back to my path"}
                  </Link>
                )}
              </div>

            </div>
          </div>

          {/* Breadcrumb below card */}
          <div className="mt-5 flex items-center justify-center gap-2 text-[0.75rem] text-text-muted">
            <Link href="/overview" className="hover:text-text-primary transition-colors">My Path</Link>
            <span>/</span>
            <Link href={`/modules/${slug}`} className="hover:text-text-primary transition-colors">{moduleTitle}</Link>
            <span>/</span>
            <span className="text-text-primary font-medium">Complete</span>
          </div>

        </div>
      </div>
    </>
  );
}
