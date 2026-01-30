"use client";

import { Globe } from "lucide-react";

interface PreviewSectionProps {
  tunnelUrls: Record<number, string>;
  activePorts?: number[];
}

export function PreviewSection({ tunnelUrls, activePorts }: PreviewSectionProps) {
  // Filter to only show active ports (detected in output)
  // If no ports detected yet, show nothing
  const entries = Object.entries(tunnelUrls)
    .filter(([port]) => activePorts?.includes(Number(port)))
    .sort(([a], [b]) => Number(a) - Number(b));

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {entries.map(([port, url]) => (
        <div key={port} className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Port {port}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline truncate"
          >
            Open preview
          </a>
        </div>
      ))}
    </div>
  );
}
