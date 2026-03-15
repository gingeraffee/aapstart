import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-5",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className, hover = false, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-bento border border-border bg-surface shadow-card",
        paddingClasses[padding],
        hover &&
          "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-bright hover:shadow-[0_20px_36px_rgba(12,24,47,0.16)]",
        className
      )}
      style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,251,255,0.94) 100%)" }}
    >
      {children}
    </div>
  );
}
