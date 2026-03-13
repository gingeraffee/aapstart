"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type ModuleTab = "content" | "acknowledge" | "quiz";

interface ModuleTabBarProps {
  slug: string;
  current: ModuleTab;
  requiresAcknowledgement: boolean;
  requiresQuiz: boolean;
}

export function ModuleTabBar({ slug, current, requiresAcknowledgement, requiresQuiz }: ModuleTabBarProps) {
  const tabs: { key: ModuleTab; label: string; href: string }[] = [
    { key: "content", label: "Content", href: `/modules/${slug}` },
    ...(requiresAcknowledgement
      ? [{ key: "acknowledge" as ModuleTab, label: "Confirmation", href: `/modules/${slug}/acknowledge` }]
      : []),
    ...(requiresQuiz
      ? [{ key: "quiz" as ModuleTab, label: "Quiz", href: `/modules/${slug}/quiz` }]
      : []),
  ];

  return (
    <div className="inline-flex rounded-[10px] bg-gray-100 p-[3px]">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "rounded-[8px] px-5 py-2.5 text-[0.8rem] font-semibold transition-all duration-200",
            tab.key === current
              ? "bg-white text-text-primary shadow-tab"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
