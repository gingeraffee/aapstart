import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}

const sizeClasses = {
  default: "max-w-[78rem]",
  narrow: "max-w-[70rem]",
  wide: "max-w-[88rem]",
};

export function PageContainer({ children, className, size = "default" }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-1 py-2 md:px-2 lg:py-4", sizeClasses[size], className)}>
      {children}
    </div>
  );
}