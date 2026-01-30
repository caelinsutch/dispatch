"use client";

import { Check, Clock, Code, Copy, GitBranch, Github, Info, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  tunnelUrls?: Record<number, string>;
}

export function MetadataSection({
  createdAt,
  model,
  branchName,
  repoOwner,
  repoName,
  artifacts = [],
  tunnelUrls,
}: MetadataSectionProps) {
  const [copied, setCopied] = useState(false);
  const [tunnelCopied, setTunnelCopied] = useState(false);

  const handleCopyTunnelCommand = async () => {
    const success = await copyToClipboard("code tunnel");
    if (success) {
      setTunnelCopied(true);
      setTimeout(() => setTunnelCopied(false), 2000);
    }
  };

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

      {/* Code Server link */}
      {tunnelUrls?.[8443] && (
        <div className="flex items-center gap-2 text-sm">
          <Code className="h-4 w-4 text-muted-foreground" />
          <a
            href={tunnelUrls[8443]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
          >
            Open in VS Code
          </a>
          <Popover>
            <PopoverTrigger className="ml-auto p-0.5 hover:bg-muted rounded transition-colors">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent
              className="w-80 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
              side="top"
              align="end"
            >
              <PopoverHeader>
                <PopoverTitle>VS Code Options</PopoverTitle>
                <PopoverDescription>Choose how to edit code in this session</PopoverDescription>
              </PopoverHeader>
              <div className="space-y-3 pt-1">
                <div className="animate-in fade-in-0 slide-in-from-left-1 duration-300 delay-75">
                  <p className="font-medium text-foreground">Browser</p>
                  <p className="text-muted-foreground text-xs">
                    Click "Open in VS Code" to edit in your browser using code-server.
                  </p>
                </div>
                <div className="animate-in fade-in-0 slide-in-from-left-1 duration-300 delay-150">
                  <p className="font-medium text-foreground">Local VS Code</p>
                  <p className="text-muted-foreground text-xs">
                    Run this command in the sandbox terminal to connect your local VS Code:
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyTunnelCommand}
                    className="group flex items-center justify-between w-full mt-1.5 text-xs bg-muted hover:bg-muted/80 px-2 py-1.5 rounded font-mono transition-colors cursor-pointer"
                  >
                    <span>code tunnel</span>
                    {tunnelCopied ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
