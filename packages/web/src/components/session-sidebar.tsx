"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  GitBranch,
  HelpCircle,
  MoreHorizontal,
  Plus,
  Settings,
  SquarePlus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { IconButton } from "@/components/ui/icon-button";
import { useSessionsContext } from "@/hooks/use-sessions";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time";

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
  onNewSession?: () => void;
  onToggle?: () => void;
}

export function SessionSidebar({ onNewSession }: SessionSidebarProps) {
  const { sessions, isLoading: initialLoading } = useSessionsContext();
  const pathname = usePathname();

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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-muted">
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
            {groupedSessions.map(([repoKey, repoSessions]) => (
              <RepoGroup
                key={repoKey}
                repoKey={repoKey}
                sessions={repoSessions}
                currentSessionId={currentSessionId}
                onNewSession={onNewSession}
              />
            ))}

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
          onClick={onNewSession}
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
    </aside>
  );
}

function RepoGroup({
  repoKey,
  sessions,
  currentSessionId,
  onNewSession,
}: {
  repoKey: string;
  sessions: SessionItem[];
  currentSessionId: string | null;
  onNewSession?: () => void;
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
          <IconButton size="sm" title="New session" onClick={onNewSession}>
            <Plus className="size-3.5" />
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

  // Use branch name or generate from title
  const branchDisplay = session.branchName || session.title || "main";
  const truncatedBranch = branchDisplay.length > 20
    ? branchDisplay.slice(0, 20) + "..."
    : branchDisplay;

  // Mock diff stats - in real app these would come from the session data
  const additions = session.additions || Math.floor(Math.random() * 500);
  const deletions = session.deletions || Math.floor(Math.random() * 200);

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
              <span className="text-sm truncate">{truncatedBranch}</span>
              <span className="text-xs font-mono flex items-center gap-1 flex-shrink-0">
                <span className="text-git-green">+{additions}</span>
                <span className="text-git-red">-{deletions}</span>
              </span>
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
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
