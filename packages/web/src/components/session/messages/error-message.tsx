import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  error: string;
  timestamp: number;
}

export function ErrorMessage({ error, timestamp }: ErrorMessageProps) {
  const time = new Date(timestamp * 1000).toLocaleTimeString();

  return (
    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 py-1">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{error}</span>
      <span className="text-xs text-secondary-foreground ml-auto">{time}</span>
    </div>
  );
}
