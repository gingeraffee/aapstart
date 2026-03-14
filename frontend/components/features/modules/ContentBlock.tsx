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
        <h2
          className="text-[1.08rem] font-extrabold tracking-[-0.02em] text-text-primary"
          style={{
            paddingBottom: "0.5rem",
            borderBottom: "2px solid rgba(14,118,189,0.12)",
            marginTop: "0.25rem",
          }}
        >
          {block.content}
        </h2>
      );

    case "text":
      return (
        <div
          className={cn(
            "prose-module text-[0.93rem] leading-[1.75] text-text-secondary",
            "[&_strong]:font-semibold [&_strong]:text-text-primary",
            "[&_a]:text-brand-bright [&_a]:underline-offset-2 [&_a]:hover:underline",
            "[&_table]:w-full [&_table]:text-[0.88rem] [&_table]:border-collapse",
            "[&_th]:bg-surface-soft [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.75rem] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.06em] [&_th]:text-text-muted [&_th]:border [&_th]:border-border",
            "[&_td]:px-4 [&_td]:py-2.5 [&_td]:border [&_td]:border-border [&_td]:text-text-secondary",
            "[&_tr:nth-child(even)_td]:bg-surface-soft",
          )}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case "callout":
      return (
        <Callout variant={(block.variant as "tip" | "info" | "warning") ?? "tip"}>
          {block.content}
        </Callout>
      );

    case "list":
      return (
        <ul className="space-y-2.5 pl-1">
          {(block.items ?? []).map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-[0.9rem] text-text-secondary leading-[1.65]">
              <span
                className="mt-[0.45rem] h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ backgroundColor: "#0e76bd", opacity: 0.7 }}
              />
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
            className="w-full rounded-[12px] border border-border"
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
        <div className="aspect-video overflow-hidden rounded-[12px] border border-border">
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
