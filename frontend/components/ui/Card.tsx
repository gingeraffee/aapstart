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
        "overflow-hidden rounded-bento border border-border bg-surface",
        paddingClasses[padding],
        hover && "cursor-pointer transition-all duration-200 hover:border-brand-action hover:-translate-y-0.5 hover:shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}
