import { AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  // Hides the wordmark on narrow screens where the header has no room for it.
  compact?: boolean;
  className?: string;
}

export default function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <AudioLines className="h-4 w-4" />
      </span>
      <span className={cn("text-sm font-semibold tracking-tight", compact && "hidden md:inline")}>
        Rakamin <span className="text-primary">AI Interview</span>
      </span>
    </span>
  );
}
