import { cn } from "@/lib/utils";
import { Callout } from "@/components/ui/Callout";
import type { ContentBlock as ContentBlockType } from "@/lib/types";

interface ContentBlockProps {
  block: ContentBlockType;
}

export function ContentBlock({ block }: ContentBlockProps) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="text-[1.15rem] font-extrabold tracking-[-0.02em] text-text-primary">
          {block.content}
        </h2>
      );

    case "text":
      return (
        <div
          className="prose-module text-[0.93rem] leading-[1.7] text-text-secondary"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case "callout":
      return (
        <Callout variant={(block.variant as "info" | "warning" | "success") ?? "info"}>
          {block.content}
        </Callout>
      );

    case "list":
      return (
        <ul className="space-y-2 pl-1">
          {(block.items ?? []).map((item, index) => (
            <li key={index} className="flex items-start gap-2.5 text-[0.88rem] text-text-secondary">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "image":
      return (
        <figure className="space-y-2">
          <img
            src={block.src}
            alt={block.alt ?? ""}
            className="w-full rounded-md border border-border"
          />
          {block.caption && (
            <figcaption className="text-center text-[0.78rem] text-text-muted">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "video":
      return (
        <div className="aspect-video overflow-hidden rounded-md border border-border">
          <iframe
            src={block.src}
            title={block.alt ?? "Video"}
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      );

    default:
      return null;
  }
}
