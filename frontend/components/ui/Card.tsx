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
      style={{ backgroundImage: "linear-gradient(180deg, rgba(255,254,251,0.99) 0%, rgba(254,250,244,0.96) 100%)" }}
    >
      {children}
    </div>
  );
}
