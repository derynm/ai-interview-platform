import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadErrorProps {
  message: string;
  onRetry?: () => void;
}

export default function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border border-destructive/40 rounded-lg p-4 text-sm text-destructive"
    >
      <span>{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      )}
    </div>
  );
}
