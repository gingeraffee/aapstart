import useSWR from "swr";
import { modulesApi, progressApi } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { usePreview } from "@/lib/context/PreviewContext";
import type { ModuleSummary, ProgressRecord } from "@/lib/types";

export function useSidebarData() {
  const { user } = useAuth();
  const { effectiveTrack, isPreviewing, canPreview } = usePreview();

  const isManagement = effectiveTrack === "management";
  const isRealHR = canPreview;
  const isEffectiveHR = effectiveTrack === "hr";

  const { data: modules } = useSWR("modules", () => modulesApi.list() as Promise<ModuleSummary[]>);
  const { data: progress } = useSWR("progress", () => progressApi.getAll() as Promise<ProgressRecord[]>);

  const allModules = modules ?? [];
  const liveModules = allModules
    .filter((m) => m.status === "published")
    .sort((a, b) => a.order - b.order);

  const isHRReplacement = (slug: string) => slug.endsWith("-hr");
  const journeyModules = liveModules
    .filter((m) => !m.tracks?.includes("management"))
    .filter((m) => {
      if (!isPreviewing) return true;
      if (m.tracks?.includes(effectiveTrack)) return true;
      if (m.tracks?.includes("all")) {
        if (effectiveTrack === "hr" && liveModules.some((hr) => hr.slug === `${m.slug}-hr`)) return false;
        return true;
      }
      if (isHRReplacement(m.slug) && effectiveTrack === "hr") return true;
      return false;
    });
  const managementModules = liveModules.filter((m) => m.tracks?.includes("management"));

  const showJourney = !isManagement;
  const isHRAdmin = user?.track === "hr" && user?.is_admin === true;
  const showManagementSection = isManagement;

  const completedCount = progress
    ? journeyModules.filter((m) => progress.find((p) => p.module_slug === m.slug)?.module_completed).length
    : 0;

  const isJourneyModuleUnlocked = (index: number) => {
    if (isEffectiveHR) return true;
    if (isPreviewing) {
      if (index === 0) return true;
      const prevSlug = journeyModules[index - 1].slug;
      return progress?.find((p) => p.module_slug === prevSlug)?.module_completed ?? false;
    }
    if (index === 0) return true;
    const prevSlug = journeyModules[index - 1].slug;
    return progress?.find((p) => p.module_slug === prevSlug)?.module_completed ?? false;
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
