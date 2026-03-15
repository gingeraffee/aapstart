import { cn } from "@/lib/utils";
import { Callout } from "@/components/ui/Callout";
import { ChecklistBlock } from "@/components/features/modules/ChecklistBlock";
import type { ContentBlock as ContentBlockType, ChecklistBlockItem } from "@/lib/types";

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
          {block.content ?? ""}
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
          dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
        />
      );

    case "callout":
      return (
        <Callout
          variant={(block.variant as "tip" | "info" | "warning") ?? "tip"}
          content={block.content ?? ""}
        />
      );

    case "list":
      return (
        <ul className="space-y-2.5 pl-1">
          {(block.items as string[] ?? []).map((item, index) => (
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

    case "checklist":
      return (
        <ChecklistBlock items={(block.items ?? []) as ChecklistBlockItem[]} />
      );

    case "link":
    case "download": {
      const isDownload = block.type === "download";
      return (
        <a
          href={block.url ?? "#"}
          target={isDownload ? "_self" : "_blank"}
          rel={isDownload ? undefined : "noopener noreferrer"}
          className="group flex items-center gap-4 rounded-[14px] px-5 py-4 no-underline transition-all"
          style={{
            background: "rgba(14,118,189,0.05)",
            border: "1.5px solid rgba(14,118,189,0.2)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(14,118,189,0.1)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(14,118,189,0.35)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(14,118,189,0.05)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(14,118,189,0.2)";
          }}
        >
          {/* Icon */}
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: "rgba(14,118,189,0.12)" }}
          >
            {isDownload ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0e76bd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v8M5 7l3 3 3-3" />
                <path d="M3 12h10" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0e76bd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9" />
                <path d="M10 2h4v4" />
                <path d="M14 2 8 8" />
              </svg>
            )}
          </span>
          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-[0.9rem] font-semibold leading-snug" style={{ color: "#0e76bd" }}>
              {block.label ?? block.url}
            </p>
            {block.description && (
              <p className="mt-0.5 text-[0.78rem] leading-[1.45] text-text-muted">
                {block.description}
              </p>
            )}
          </div>
          {/* Chevron */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0e76bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50 transition-opacity group-hover:opacity-100">
            <path d="M5 2l4 5-4 5" />
          </svg>
        </a>
      );
    }

    default:
      return null;
  }
}
