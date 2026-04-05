import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import type { ModuleSummary, ProgressRecord } from "@/lib/types";

export function useSidebarData() {
  const { user } = useAuth();
  const { effectiveTrack, isPreviewing, canPreview, previewCompletedSlugs } = usePreview();

  const isManagement = effectiveTrack === "management";
  const isRealHR = canPreview;
  const isEffectiveHR = effectiveTrack === "hr";

  const { data: modules } = useSWR(`modules:${effectiveTrack}`, () => modulesApi.list(effectiveTrack) as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  const allModules = modules ?? [];
  const liveModules = allModules
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  const isHRReplacement = (slug: string) => slug.endsWith("-hr");
  const journeyModules = liveModules
    .filter((m) => !m.tracks?.includes("management"))
    .filter((m) => !isPreviewing || m.tracks?.includes("all") || m.tracks?.includes(effectiveTrack) || isHRReplacement(m.slug));
  const managementModules = liveModules.filter((m) => m.tracks?.includes("management"));

  const showJourney = !isManagement;
  const isHRAdmin = user?.track === "hr" && user?.is_admin === true;
  const showManagementSection = isManagement;

  const isSlugCompleted = (slug: string) =>
    (isPreviewing && previewCompletedSlugs.has(slug)) ||
    (progress?.find((p) => p.module_slug === slug)?.module_completed ?? false);

  const completedCount = journeyModules.filter((m) => isSlugCompleted(m.slug)).length;

  const isJourneyModuleUnlocked = (index: number) => {
    if (isEffectiveHR) return true;
    if (index === 0) return true;
    return isSlugCompleted(journeyModules[index - 1].slug);
  };

  const canCollapse = isRealHR && isEffectiveHR;

  return {
    user,
    modules: allModules,
    progress: progress ?? [],
    journeyModules,
    managementModules,
    showJourney,
    showManagementSection,
    completedCount,
    isJourneyModuleUnlocked,
    canCollapse,
    isManagement,
    isEffectiveHR,
    isRealHR,
    effectiveTrack,
    isPreviewing,
    canPreview,
  };
}
