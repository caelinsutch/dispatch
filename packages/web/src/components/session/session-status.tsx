interface SessionStatusProps {
  connected: boolean;
  connecting: boolean;
  sandboxStatus?: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string; pulse?: boolean }
> = {
  pending: {
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground",
    label: "Starting...",
  },
  warming: {
    color: "text-yellow-600 dark:text-yellow-500",
    bgColor: "bg-yellow-500",
    label: "Warming up...",
    pulse: true,
  },
  syncing: { color: "text-accent", bgColor: "bg-accent", label: "Syncing...", pulse: true },
  ready: { color: "text-success", bgColor: "bg-success", label: "Ready" },
  running: { color: "text-accent", bgColor: "bg-accent", label: "Running", pulse: true },
  stopped: { color: "text-muted-foreground", bgColor: "bg-muted-foreground", label: "Stopped" },
  failed: { color: "text-red-600 dark:text-red-500", bgColor: "bg-red-500", label: "Failed" },
};

export function SessionStatus({ connected, connecting, sandboxStatus }: SessionStatusProps) {
  if (connecting) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-500">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        Connecting...
      </span>
    );
  }

  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-500">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Disconnected
      </span>
    );
  }

  const config = STATUS_CONFIG[sandboxStatus || "pending"] || STATUS_CONFIG.pending;

  return (
    <span className={`flex items-center gap-1.5 text-xs ${config.color}`}>
      <span
        className={`w-2 h-2 rounded-full ${config.bgColor} ${config.pulse ? "animate-pulse" : ""}`}
      />
      {config.label}
    </span>
  );
}
