import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLockupProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function BrandLockup({ className, imageClassName, priority = false }: BrandLockupProps) {
  return (
    <div className={cn("inline-flex items-center rounded-[26px] border border-white/10 bg-black/90 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.28)]", className)}>
      <Image
        src="/logo.png"
        alt="American Associated Pharmacies"
        width={480}
        height={155}
        priority={priority}
        className={cn("h-auto w-[14rem] object-contain md:w-[16rem]", imageClassName)}
      />
    </div>
  );
}