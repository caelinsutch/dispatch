"use client";

import { FileText, PanelLeft, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { SessionListSkeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { formatRelativeTime, isInactiveSession } from "@/lib/time";

export interface SessionItem {
  id: string;
  title: string | null;
  repoOwner: string;
  repoName: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

interface SessionSidebarProps {
  onNewSession?: () => void;
  onToggle?: () => void;
}

export function SessionSidebar({ onNewSession, onToggle }: SessionSidebarProps) {
  const { data: authSession } = authClient.useSession();
  const pathname = usePathname();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch once when authSession becomes available
    if (authSession && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchSessions();
    }
  }, [authSession]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = (await res.json()) as { sessions?: SessionItem[] };
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  // Sort sessions by updatedAt (most recent first) and filter by search query
  const { activeSessions, inactiveSessions } = useMemo(() => {
    const filtered = sessions.filter((session) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const title = session.title?.toLowerCase() || "";
      const repo = `${session.repoOwner}/${session.repoName}`.toLowerCase();
      return title.includes(query) || repo.includes(query);
    });

    // Sort by updatedAt descending
    const sorted = [...filtered].sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt;
      const bTime = b.updatedAt || b.createdAt;
      return bTime - aTime;
    });

    const active: SessionItem[] = [];
    const inactive: SessionItem[] = [];

    for (const session of sorted) {
      const timestamp = session.updatedAt || session.createdAt;
      if (isInactiveSession(timestamp)) {
        inactive.push(session);
      } else {
        active.push(session);
      }
    }

    return { activeSessions: active, inactiveSessions: inactive };
  }, [sessions, searchQuery]);

  const currentSessionId = pathname?.startsWith("/session/") ? pathname.split("/")[2] : null;

  return (
    <aside className="w-72 h-screen flex flex-col border-r border-border-muted bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-muted">
        <div className="flex items-center gap-2">
          <IconButton onClick={onToggle} title="Toggle sidebar" size="sm">
            <PanelLeft />
          </IconButton>
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-semibold text-foreground">Inspect</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ModeToggle />
          <IconButton onClick={onNewSession} title="New session" size="sm">
            <Plus />
          </IconButton>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <Input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {initialLoading ? (
          <SessionListSkeleton count={6} />
        ) : sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No sessions yet</div>
        ) : (
          <>
            {/* Active Sessions */}
            {activeSessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
              />
            ))}

            {/* Inactive Divider */}
            {inactiveSessions.length > 0 && (
              <>
                <div className="px-4 py-2 mt-2">
                  <span className="text-xs font-medium text-secondary-foreground uppercase tracking-wide">
                    Inactive
                  </span>
                </div>
                {inactiveSessions.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function SessionListItem({ session, isActive }: { session: SessionItem; isActive: boolean }) {
  const timestamp = session.updatedAt || session.createdAt;
  const relativeTime = formatRelativeTime(timestamp);
  const displayTitle = session.title || `${session.repoOwner}/${session.repoName}`;
  const repoInfo = `${session.repoOwner}/${session.repoName}`;

  return (
    <Link
      href={`/session/${session.id}`}
      className={`block px-4 py-2.5 border-l-2 transition ${
        isActive ? "border-l-accent bg-accent-muted" : "border-l-transparent hover:bg-muted"
      }`}
    >
      <div className="truncate text-sm font-medium text-foreground">{displayTitle}</div>
      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
        <span>{relativeTime}</span>
        <span>·</span>
        <span className="truncate">{repoInfo}</span>
      </div>
    </Link>
  );
}
