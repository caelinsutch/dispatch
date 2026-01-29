"use client";

interface PreviewSectionProps {
  tunnelUrls: Record<number, string>;
}

export function PreviewSection({ tunnelUrls }: PreviewSectionProps) {
  const entries = Object.entries(tunnelUrls).sort(([a], [b]) => Number(a) - Number(b));

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {entries.map(([port, url]) => (
        <div key={port} className="flex items-center gap-2 text-sm">
          <GlobeIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path
        strokeLinecap="round"
        strokeWidth={2}
        d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
      />
    </svg>
  );
}
