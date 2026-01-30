"use client";

import { Check, Clock, Copy, GitBranch, Github, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { copyToClipboard, formatModelName, truncateBranch } from "@/lib/format";
import { formatRelativeTime } from "@/lib/time";
import type { Artifact } from "@/types/session";

interface MetadataSectionProps {
  createdAt: number;
  model?: string;
  branchName?: string;
  repoOwner?: string;
  repoName?: string;
  artifacts?: Artifact[];
}

export function MetadataSection({
  createdAt,
  model,
  branchName,
  repoOwner,
  repoName,
  artifacts = [],
}: MetadataSectionProps) {
  const [copied, setCopied] = useState(false);

  const prArtifact = artifacts.find((a) => a.type === "pr");
  const prNumber = prArtifact?.metadata?.prNumber;
  const prState = prArtifact?.metadata?.prState as
    | "open"
    | "merged"
    | "closed"
    | "draft"
    | undefined;
  const prUrl = prArtifact?.url;

  const handleCopyBranch = async () => {
    if (branchName) {
      const success = await copyToClipboard(branchName);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const getPrBadgeVariant = (
    state?: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (state) {
      case "merged":
        return "default";
      case "closed":
        return "destructive";
      case "draft":
        return "secondary";
      case "open":
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-3">
      {/* Timestamp */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{formatRelativeTime(createdAt)}</span>
      </div>

      {/* Model */}
      {model && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>{formatModelName(model)}</span>
        </div>
      )}

      {/* PR Badge */}
      {prNumber && (
        <div className="flex items-center gap-2 text-sm">
          <Github className="h-4 w-4 text-muted-foreground" />
          {prUrl ? (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              #{prNumber}
            </a>
          ) : (
            <span className="text-foreground">#{prNumber}</span>
          )}
          {prState && <Badge variant={getPrBadgeVariant(prState)}>{prState}</Badge>}
        </div>
      )}

      {/* Branch */}
      {branchName && (
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground truncate max-w-[180px]" title={branchName}>
            {truncateBranch(branchName)}
          </span>
          <button
            type="button"
            onClick={handleCopyBranch}
            className="p-1 hover:bg-muted transition-colors"
            title={copied ? "Copied!" : "Copy branch name"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-secondary-foreground" />
            )}
          </button>
        </div>
      )}

      {/* Repository tag */}
      {repoOwner && repoName && (
        <div className="flex items-center gap-2 text-sm">
          <Github className="h-4 w-4 text-muted-foreground" />
          <a
            href={`https://github.com/${repoOwner}/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
          >
            {repoOwner}/{repoName}
          </a>
        </div>
      )}
    </div>
  );
}
