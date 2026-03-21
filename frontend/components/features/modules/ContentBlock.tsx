import { cn } from "@/lib/utils";
import { Callout } from "@/components/ui/Callout";
import { ChecklistBlock } from "@/components/features/modules/ChecklistBlock";
import { AsideCard } from "@/components/features/modules/AsideCard";
import { QRCodeBlock } from "@/components/features/modules/QRCodeBlock";
import type { ContentBlock as ContentBlockType, ChecklistBlockItem } from "@/lib/types";

/** Make every <a href="..."> open in a new tab. */
function externalizeLinks(html: string): string {
  return html.replace(
    /<a\s+(href="[^"]*")/g,
    '<a target="_blank" rel="noopener noreferrer" $1',
  );
}

const RESOURCE_CALLOUT_LABELS: Record<string, string> = {
  tip: "Manager note",
  info: "Worth noting",
  warning: "Watch for",
};

interface ContentBlockProps {
  block: ContentBlockType;
  emphasizeLead?: boolean;
  /** "training" uses default labels; "resource" uses management-friendly labels */
  variant?: "training" | "resource";
}

export function ContentBlock({ block, emphasizeLead = false, variant = "training" }: ContentBlockProps) {
  switch (block.type) {
    case "heading":
      return (
        <div className="flex items-center gap-2.5" style={{ marginTop: "0.25rem" }}>
          <span
            className="h-4 w-[3px] shrink-0 rounded-full"
            style={{ background: "linear-gradient(180deg, #22d3ee 0%, #0ea5d9 100%)" }}
          />
          <h2
            className="text-[1.08rem] font-bold tracking-[-0.015em]"
            style={{ color: "var(--heading-color)" }}
          >
            {block.content ?? ""}
          </h2>
        </div>
      );

    case "text":
      return (
        <div
          className={cn(
            "prose-module text-[0.95rem] leading-[1.72] text-text-secondary",
            emphasizeLead &&
              "[&_p:first-of-type]:text-[1.04rem] [&_p:first-of-type]:leading-[1.75] [&_p:first-of-type]:text-[#4d6685]",
            "[&_strong]:font-semibold [&_strong]:text-text-primary",
            "[&_a]:text-brand-bright [&_a]:underline-offset-2 [&_a]:hover:underline",
            "[&_p]:max-w-none",
            "[&_li]:max-w-none",
            "[&_table]:w-full [&_table]:text-[0.88rem] [&_table]:border-collapse",
            "[&_th]:bg-surface-soft [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.75rem] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.06em] [&_th]:text-text-muted [&_th]:border [&_th]:border-border",
            "[&_td]:px-4 [&_td]:py-2.5 [&_td]:border [&_td]:border-border [&_td]:text-text-secondary",
            "[&_tr:nth-child(even)_td]:bg-surface-soft",
          )}
          dangerouslySetInnerHTML={{ __html: externalizeLinks(block.content ?? "") }}
        />
      );

    case "callout": {
      const calloutVariant = (block.variant as "tip" | "info" | "warning") ?? "tip";
      return (
        <Callout
          variant={calloutVariant}
          content={externalizeLinks(block.content ?? "")}
          label={variant === "resource" ? RESOURCE_CALLOUT_LABELS[calloutVariant] : undefined}
        />
      );
    }

    case "list":
      return (
        <ul className="space-y-2.5 pl-1">
          {(block.items as string[] ?? []).map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-[0.9rem] text-text-secondary leading-[1.65]">
              <span
                className="mt-[0.45rem] h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ backgroundColor: "#0f7fb3", opacity: 0.62 }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "image":
      return (
        <figure
          className="overflow-hidden rounded-[14px] border p-2"
          style={{
            borderColor: "var(--module-pill-border)",
            background: "var(--module-pill-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <img src={block.src} alt={block.alt ?? ""} className="w-full rounded-[10px]" style={{ border: "1px solid var(--card-border)" }} />
          {block.caption && <figcaption className="px-1 pt-2 text-[0.76rem] leading-[1.5]" style={{ color: "var(--module-context)" }}>{block.caption}</figcaption>}
        </figure>
      );

    case "video": {
      const isEmbed = block.src?.startsWith("http") && !block.src?.endsWith(".mp4");
      return (
        <div
          className="overflow-hidden rounded-[14px] border"
          style={{
            borderColor: "var(--module-pill-border)",
            background: "var(--module-pill-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="aspect-video overflow-hidden">
            {isEmbed ? (
              <iframe
                src={block.src}
                title={block.alt ?? "Video"}
                className="h-full w-full"
                allowFullScreen
              />
            ) : (
              <video
                src={block.src}
                title={block.alt ?? "Video"}
                className="h-full w-full object-contain bg-black"
                controls
                preload="metadata"
              />
            )}
          </div>
        </div>
      );
    }

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
          download={isDownload ? "" : undefined}
          target={isDownload ? "_self" : "_blank"}
          rel={isDownload ? undefined : "noopener noreferrer"}
          className="group flex items-center gap-4 rounded-[14px] border px-5 py-4 no-underline transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "rgba(14,118,189,0.04)",
            borderColor: "rgba(14,118,189,0.2)",
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
            {!block.description ? (
              <p className="mt-0.5 text-[0.74rem] leading-[1.45] text-[#607896]">
                {isDownload ? "Download and review when needed." : "Opens in a new tab."}
              </p>
            ) : null}
          </div>
          {/* Chevron */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0e76bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50 transition-opacity group-hover:opacity-100">
            <path d="M5 2l4 5-4 5" />
          </svg>
        </a>
      );
    }

    case "aside":
      return (
        <AsideCard
          header={block.label ?? ""}
          content={block.content ?? ""}
        />
      );

    case "qrcode":
      return (
        <QRCodeBlock
          url={block.url ?? ""}
          label={block.label}
        />
      );

    case "track_block":
      return (
        <div
          className={cn(
            "prose-module text-[0.95rem] leading-[1.72] text-text-secondary",
            "[&_strong]:font-semibold [&_strong]:text-text-primary",
            "[&_a]:text-brand-bright [&_a]:underline-offset-2 [&_a]:hover:underline",
            "[&_p]:max-w-none",
            "[&_li]:max-w-none",
          )}
          dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
        />
      );

    default:
      return null;
  }
}
