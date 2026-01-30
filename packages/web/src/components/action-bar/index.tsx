"use client";

import { Archive, Github, GitPullRequest, Globe, Link, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Artifact } from "@/types/session";
import { ActionBarContext, useActionBar } from "./context";

// Root component - provides context
interface ActionBarRootProps {
  sessionId: string;
  isArchived: boolean;
  artifacts: Artifact[];
  children: React.ReactNode;
}

function ActionBarRoot({ sessionId, isArchived, artifacts, children }: ActionBarRootProps) {
  return (
    <ActionBarContext value={{ sessionId, isArchived, artifacts }}>
      <div className="flex items-center gap-2">{children}</div>
    </ActionBarContext>
  );
}

// Preview link component
function PreviewLink() {
  const { artifacts } = useActionBar();
  const previewArtifact = artifacts.find((a) => a.type === "preview");

  if (!previewArtifact?.url) return null;

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={previewArtifact.url} target="_blank" rel="noopener noreferrer">
        <Globe className="h-4 w-4" />
        <span>View preview</span>
        {previewArtifact.metadata?.previewStatus === "outdated" && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400">(outdated)</span>
        )}
      </a>
    </Button>
  );
}

// PR link component
function PrLink() {
  const { artifacts } = useActionBar();
  const prArtifact = artifacts.find((a) => a.type === "pr");

  if (!prArtifact?.url) return null;

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={prArtifact.url} target="_blank" rel="noopener noreferrer">
        <GitPullRequest className="h-4 w-4" />
        <span>View PR</span>
      </a>
    </Button>
  );
}

// Archive toggle component
interface ArchiveToggleProps {
  onArchive: () => void;
  onUnarchive: () => void;
}

function ArchiveToggle({ onArchive, onUnarchive }: ArchiveToggleProps) {
  const { isArchived } = useActionBar();
  const [isArchiving, setIsArchiving] = useState(false);

  const handleClick = async () => {
    setIsArchiving(true);
    try {
      if (isArchived) {
        onUnarchive();
      } else {
        onArchive();
      }
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isArchiving}>
      <Archive className="h-4 w-4" />
      <span>{isArchived ? "Unarchive" : "Archive"}</span>
    </Button>
  );
}

// Menu component
function Menu() {
  const { sessionId, artifacts } = useActionBar();
  const prArtifact = artifacts.find((a) => a.type === "pr");

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/session/${sessionId}`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link className="h-4 w-4" />
          Copy link
        </DropdownMenuItem>
        {prArtifact?.url && (
          <DropdownMenuItem asChild>
            <a href={prArtifact.url} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              View in GitHub
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export compound component
export const ActionBar = {
  Root: ActionBarRoot,
  PreviewLink,
  PrLink,
  ArchiveToggle,
  Menu,
};

export { useActionBar } from "./context";
