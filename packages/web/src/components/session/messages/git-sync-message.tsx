interface GitSyncMessageProps {
  status: string;
  timestamp: number;
}

export function GitSyncMessage({ status, timestamp }: GitSyncMessageProps) {
  const time = new Date(timestamp * 1000).toLocaleTimeString();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-accent" />
      Git sync: {status}
      <span className="text-xs">{time}</span>
    </div>
  );
}
