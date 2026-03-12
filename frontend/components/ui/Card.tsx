import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-5",
  md: "p-7",
  lg: "p-9",
};

export function Card({ children, className, hover = false, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-white/80 bg-white/90 shadow-card backdrop-blur-xl",
        paddingClasses[padding],
        hover && "cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-raised",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
      {children}
    </div>
  );
}