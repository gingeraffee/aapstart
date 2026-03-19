"use client";

interface AsideCardProps {
  content: string;
  header?: string;
}

export function AsideCard({ content }: AsideCardProps) {
  return (
    <div
      style={{
        float: "right",
        shapeMargin: "12px",
        width: 220,
        marginLeft: 20,
        marginBottom: 16,
        borderLeft: "3px solid #22d3ee",
        borderRadius: "0 8px 8px 0",
        background: "var(--color-background-secondary)",
        padding: "0.875rem 1.25rem",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-text-tertiary)",
          marginBottom: "0.4rem",
        }}
      >
        WORTH NOTING
      </p>
      <div
        style={{
          fontSize: 13,
          color: "var(--color-text-primary)",
          lineHeight: 1.6,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
