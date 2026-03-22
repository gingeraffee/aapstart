"use client";

interface AsideCardProps {
  content: string;
  header?: string;
}

export function AsideCard({ content, header }: AsideCardProps) {
  return (
    <div
      className="my-3 w-full overflow-hidden rounded-[16px] border px-5 py-4"
      style={{
        clear: "both",
        borderColor: "rgba(151, 179, 214, 0.34)",
        background: "linear-gradient(180deg, rgba(247, 250, 255, 0.98) 0%, rgba(241, 247, 255, 0.9) 100%)",
        boxShadow: "0 10px 24px rgba(17, 39, 68, 0.06)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: "rgba(14, 118, 189, 0.1)", color: "#0e76bd" }}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="5.25" />
            <path d="M8 7v3" />
            <path d="M8 5.2h.01" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--sidebar-label)" }}
          >
            {header || "Worth Noting"}
          </p>
      <div
            className="prose-module text-[0.9rem] leading-[1.65]"
            style={{ color: "var(--color-text-primary)" }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
