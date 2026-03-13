import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}

const sizeClasses = {
  default: "max-w-[1100px]",
  narrow: "max-w-[800px]",
  wide: "max-w-[1100px]",
};

export function PageContainer({ children, className, size = "default" }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-6 py-6 lg:px-10 lg:py-10", sizeClasses[size], className)}>
      {children}
    </div>
  );
}
