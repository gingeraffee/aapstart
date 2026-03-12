import type { ContentBlock as ContentBlockType } from "@/lib/types";
import { Callout } from "@/components/ui/Callout";
import { TabGroup } from "@/components/ui/TabGroup";
import { ChecklistBlock } from "./ChecklistBlock";

interface ContentBlockProps {
  block: ContentBlockType;
  onChecklistChange?: (items: Record<string, boolean>) => void;
}

export function ContentBlock({ block, onChecklistChange }: ContentBlockProps) {
  switch (block.type) {
    case "text":
      return <div className="prose-module" dangerouslySetInnerHTML={{ __html: block.content }} />;

    case "callout":
      return <Callout variant={block.variant} content={block.content} />;

    case "tabs":
      return <TabGroup tabs={block.tabs} />;

    case "checklist":
      return <ChecklistBlock items={block.items} onChange={onChecklistChange} />;

    case "track_block":
      return <div className="prose-module" dangerouslySetInnerHTML={{ __html: block.content }} />;

    case "download":
      return (
        <a
          href={`/api/resources/download?filename=${encodeURIComponent(block.filename)}`}
          download
          className="group my-4 flex items-center gap-4 rounded-[24px] border border-white/80 bg-white/[0.84] p-5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-brand-action/[0.08] text-brand-action shadow-sm">
            <span className="text-lg">↓</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ui font-semibold text-text-primary group-hover:text-brand-action">{block.label}</p>
            {block.description && <p className="mt-1 text-caption text-text-muted">{block.description}</p>}
          </div>
          <span className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted group-hover:text-brand-action">Download</span>
        </a>
      );

    case "link":
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group my-4 flex items-center gap-4 rounded-[24px] border border-white/80 bg-white/[0.84] p-5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-brand-deep/[0.08] text-brand-deep shadow-sm">
            <span className="text-lg">↗</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ui font-semibold text-text-primary group-hover:text-brand-action">{block.label}</p>
            {block.description && <p className="mt-1 text-caption text-text-muted">{block.description}</p>}
          </div>
          <span className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted group-hover:text-brand-action">Open link</span>
        </a>
      );

    case "video":
      return (
        <div className="my-6 overflow-hidden rounded-[28px] border border-white/80 bg-white/[0.86] shadow-card backdrop-blur-xl">
          <iframe
            src={block.url}
            title={block.title ?? "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
      );

    case "image":
      return (
        <figure className="my-6 overflow-hidden rounded-[28px] border border-white/80 bg-white/[0.86] p-3 shadow-card backdrop-blur-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt ?? ""} className="w-full rounded-[22px]" />
          {block.caption && <figcaption className="mt-3 text-center text-caption text-text-muted">{block.caption}</figcaption>}
        </figure>
      );

    default:
      return null;
  }
}