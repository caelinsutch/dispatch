import { cn } from "@/lib/utils";

type StatusVariant = "active" | "idle" | "pending" | "success" | "warning" | "error";

interface StatusIndicatorProps {
  status?: StatusVariant;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const statusColors: Record<StatusVariant, string> = {
  active: "bg-accent",
  idle: "bg-muted-foreground",
  pending: "bg-yellow-500",
  success: "bg-success",
  warning: "bg-yellow-500",
  error: "bg-destructive",
};

const sizeClasses = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
};

export function StatusIndicator({
  status = "active",
  pulse = false,
  size = "md",
  className,
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "rounded-full",
        sizeClasses[size],
        statusColors[status],
        pulse && "animate-pulse",
        className
      )}
    />
  );
}
