import { cn } from "@/lib/utils";

interface ProgressDotsProps {
  total: number;
  completed: number;
  className?: string;
}

export function ProgressDots({ total, completed, className }: ProgressDotsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length: total }).map((_, index) => {
        const done = index < completed;
        return (
          <div
            key={index}
            className={cn(
              "h-2.5 flex-1 rounded-full transition-all duration-300",
              done ? "bg-[linear-gradient(135deg,#243673_0%,#3077b9_100%)] shadow-sm" : "bg-border/80"
            )}
            aria-label={done ? "Completed" : "Not yet complete"}
          />
        );
      })}
    </div>
  );
}