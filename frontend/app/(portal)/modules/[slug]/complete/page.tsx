"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { modulesApi } from "@/lib/api";
import { CompletionMoment } from "@/components/features/completion/CompletionMoment";
import { FullPageSpinner } from "@/components/ui/Spinner";
import type { ModuleDetail } from "@/lib/types";

export default function CompletePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: module, isLoading } = useSWR(
    `module:${slug}`,
    () => modulesApi.get(slug) as Promise<ModuleDetail>
  );

  if (isLoading || !module) return <FullPageSpinner />;

  return (
    <CompletionMoment
      moduleTitle={module.title}
      isLastModule={module.slug === "final-review"}
    />
  );
}
