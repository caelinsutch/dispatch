"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  GitBranch,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  Plus,
  Settings,
  SquarePlus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddRepositoryModal } from "@/components/add-repository-modal";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { IconButton } from "@/components/ui/icon-button";
import { useSessionsContext } from "@/hooks/use-sessions";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface SessionItem {
  id: string;
  title: string | null;
  repoOwner: string;
  repoName: string;
  branchName?: string | null;
  status: string;
  createdAt: number;
  updatedAt: number;
  // Mock diff stats - would come from server in real implementation
  additions?: number;
  deletions?: number;
}

interface SessionSidebarProps {
  onToggle?: () => void;
}

export function SessionSidebar(_props: SessionSidebarProps) {
  const { sessions, isLoading: initialLoading, createSession } = useSessionsContext();
  const pathname = usePathname();
  const router = useRouter();
  const [addRepoModalOpen, setAddRepoModalOpen] = useState(false);
  const [creatingForRepo, setCreatingForRepo] = useState<string | null>(null);

  const handleCreateSessionForRepo = async (repoOwner: string, repoName: string) => {
    const repoKey = `${repoOwner}/${repoName}`;
    setCreatingForRepo(repoKey);

    const result = await createSession(repoOwner, repoName);

    if (result.success && result.sessionId) {
      router.push(`/session/${result.sessionId}`);
    }

    setCreatingForRepo(null);
  };

  // Separate active and archived sessions
  const { activeSessions, archivedSessions } = useMemo(() => {
    const active: SessionItem[] = [];
    const archived: SessionItem[] = [];
    for (const session of sessions) {
      if (session.status === "archived") {
        archived.push(session);
      } else {
        active.push(session);
      }
    }
    return { activeSessions: active, archivedSessions: archived };
  }, [sessions]);

  // Group active sessions by repo
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, SessionItem[]>();
    for (const session of activeSessions) {
      const repoKey = `${session.repoOwner}/${session.repoName}`;
      const existing = groups.get(repoKey) || [];
      existing.push(session);
      groups.set(repoKey, existing);
    }

    // Sort sessions within each group by updatedAt descending
    for (const [key, items] of groups) {
      items.sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        return bTime - aTime;
      });
      groups.set(key, items);
    }

    // Sort groups by most recent session
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const aLatest = a[1][0]?.updatedAt || a[1][0]?.createdAt || 0;
      const bLatest = b[1][0]?.updatedAt || b[1][0]?.createdAt || 0;
      return bLatest - aLatest;
    });

    return sortedGroups;
  }, [activeSessions]);

  const [showArchived, setShowArchived] = useState(false);

  const currentSessionId = pathname?.startsWith("/session/") ? pathname.split("/")[2] : null;

  return (
    <aside className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border-muted">
        <svg
          className="size-4 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span className="text-sm font-medium text-foreground">Workspaces</span>
      </div>

      {/* Repository List */}
      <div className="flex-1 overflow-y-auto">
        {initialLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : activeSessions.length === 0 && archivedSessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No workspaces yet
          </div>
        ) : (
          <div>
            {groupedSessions.map(([repoKey, repoSessions]) => {
              const [owner, name] = repoKey.split("/");
              return (
                <RepoGroup
                  key={repoKey}
                  repoKey={repoKey}
                  sessions={repoSessions}
                  currentSessionId={currentSessionId}
                  onCreateSession={() => handleCreateSessionForRepo(owner, name)}
                  isCreating={creatingForRepo === repoKey}
                />
              );
            })}

            {/* Archived Sessions Section */}
            {archivedSessions.length > 0 && (
              <div className="border-t border-border-muted mt-2">
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className="w-full flex items-center gap-2 px-2 py-2 hover:bg-muted/50 transition-colors text-muted-foreground select-none"
                >
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform duration-200",
                      !showArchived && "-rotate-90"
                    )}
                  />
                  <Archive className="size-3.5" />
                  <span className="text-sm">Archived ({archivedSessions.length})</span>
                </button>
                {showArchived && (
                  <div className="pb-1">
                    {archivedSessions.map((session) => (
                      <SessionListItem
                        key={session.id}
                        session={session}
                        isActive={session.id === currentSessionId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-muted px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setAddRepoModalOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <SquarePlus className="size-4" />
          <span>Add repository</span>
        </button>
        <div className="flex items-center gap-1">
          <IconButton size="sm" title="Help">
            <HelpCircle className="size-4" />
          </IconButton>
          <IconButton size="sm" title="Settings">
            <Settings className="size-4" />
          </IconButton>
        </div>
      </div>

      <AddRepositoryModal open={addRepoModalOpen} onOpenChange={setAddRepoModalOpen} />
    </aside>
  );
}

function RepoGroup({
  repoKey,
  sessions,
  currentSessionId,
  onCreateSession,
  isCreating,
}: {
  repoKey: string;
  sessions: SessionItem[];
  currentSessionId: string | null;
  onCreateSession: () => void;
  isCreating: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasActiveSession = sessions.some((s) => s.id === currentSessionId);

  useEffect(() => {
    if (hasActiveSession && !isExpanded) {
      setIsExpanded(true);
    }
  }, [hasActiveSession, isExpanded]);

  const repoName = repoKey.split("/")[1] || repoKey;
  const firstLetter = repoName.charAt(0).toUpperCase();

  return (
    <div className="border-b border-border-muted last:border-b-0">
      {/* Repo Header */}
      <div className="group flex items-center gap-2 px-2 py-2 hover:bg-muted/50 transition-colors select-none">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <ChevronDown
            className={cn(
              "size-3 text-muted-foreground transition-transform duration-200 flex-shrink-0",
              !isExpanded && "-rotate-90"
            )}
          />
          <span className="size-5 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
            {firstLetter}
          </span>
          <span className="text-sm font-medium truncate">{repoName}</span>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton size="sm" title="More options">
            <MoreHorizontal className="size-3.5" />
          </IconButton>
          <IconButton size="sm" title="New session" onClick={onCreateSession} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
          </IconButton>
        </div>
      </div>

      {/* Sessions */}
      {isExpanded && (
        <div className="pb-1">
          {sessions.map((session) => (
            <SessionListItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionListItem({ session, isActive }: { session: SessionItem; isActive: boolean }) {
  const router = useRouter();
  const { archiveSession, unarchiveSession, deleteSession } = useSessionsContext();
  const timestamp = session.updatedAt || session.createdAt;
  const relativeTime = formatRelativeTime(timestamp);
  const isArchived = session.status === "archived";

  // Display title (matching the session page header)
  const titleDisplay = session.title || `${session.repoOwner}/${session.repoName}`;
  const truncatedTitle =
    titleDisplay.length > 25 ? titleDisplay.slice(0, 25) + "..." : titleDisplay;

  // Diff stats from actual file changes (synced when viewing session)
  const additions = session.additions ?? 0;
  const deletions = session.deletions ?? 0;
  const hasDiffStats = additions > 0 || deletions > 0;

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isArchived) {
      await unarchiveSession(session.id);
    } else {
      await archiveSession(session.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await deleteSession(session.id);
    if (success && isActive) {
      router.push("/");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link
          href={`/session/${session.id}`}
          className={cn(
            "flex items-start gap-2 px-2 py-2 mx-2 rounded-sm transition-colors select-none",
            isActive ? "bg-muted" : "hover:bg-muted/50",
            isArchived && "opacity-60"
          )}
        >
          <GitBranch className="size-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm truncate">{truncatedTitle}</span>
              {hasDiffStats && (
                <span className="text-xs font-mono flex items-center gap-1 flex-shrink-0">
                  <span className="text-git-green">+{additions}</span>
                  <span className="text-git-red">-{deletions}</span>
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {session.repoName} · {relativeTime}
              {isArchived && " · Archived"}
            </div>
          </div>
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleArchive}>
          {isArchived ? (
            <>
              <ArchiveRestore className="mr-2 size-4" />
              Unarchive
            </>
          ) : (
            <>
              <Archive className="mr-2 size-4" />
              Archive
            </>
          )}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
