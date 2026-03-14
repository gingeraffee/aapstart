"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleTabBar } from "@/components/layout/ModuleTabBar";
import { ContentBlock } from "@/components/features/modules/ContentBlock";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
      <PageContainer>
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      </PageContainer>
    );
  }

  if (error || !module) {
    return (
      <PageContainer>
        <p className="text-[0.88rem] text-text-secondary">Module not found.</p>
      </PageContainer>
    );
  }

  const currentModule = module;

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

  return (
    <PageContainer>
      <div className="space-y-6 animate-fade-up">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-text-muted">
          <Link href="/overview" className="hover:text-text-primary transition-colors">My Path</Link>
          <span>/</span>
          <span className="text-text-primary font-medium">{currentModule.title}</span>
        </div>

        {/* Title bar */}
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent">
            Module {String(currentModule.order).padStart(2, "0")}
          </p>
          <h1 className="mt-2 text-[clamp(1.6rem,2.5vw,2rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-text-primary">
            {currentModule.title}
          </h1>
          {currentModule.description && (
            <p className="mt-3 max-w-2xl text-[0.93rem] leading-[1.7] text-text-secondary">
              {currentModule.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="active">
              ~{currentModule.estimated_minutes} {plural(currentModule.estimated_minutes, "min", "mins")}
            </Badge>
            {currentModule.requires_acknowledgement && <Badge variant="locked">Acknowledgement</Badge>}
            {currentModule.requires_quiz && <Badge variant="locked">Quiz</Badge>}
          </div>
        </div>

        {/* Tab bar */}
        <ModuleTabBar
          slug={slug}
          current="content"
          requiresAcknowledgement={currentModule.requires_acknowledgement}
          requiresQuiz={currentModule.requires_quiz}
        />

        {/* Content card */}
        <div className="rounded-bento border border-border bg-surface p-6 md:p-8">
          <div className="space-y-6">
            {currentModule.content_blocks.map((block, index) => (
              <div key={index} className="animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                <ContentBlock block={block} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href="/overview" className="text-[0.88rem] font-semibold text-text-muted hover:text-text-primary transition-colors">
            ← Back to my path
          </Link>
          <Button size="lg" onClick={handleContinue}>
            {currentModule.requires_acknowledgement
              ? "Continue to confirmation"
              : currentModule.requires_quiz
                ? "Continue to quiz"
                : "Mark complete"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
