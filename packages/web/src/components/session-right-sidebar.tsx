"use client";

import { useMemo } from "react";
import { extractLatestTasks } from "@/lib/tasks";
import type { Artifact, FileChange } from "@/types/session";
import {
  CollapsibleSection,
  FilesChangedSection,
  MetadataSection,
  ParticipantsSection,
  PreviewSection,
  TasksSection,
} from "./sidebar";
import { RightSidebarSkeleton } from "./ui/skeleton";

interface SessionState {
  id: string;
  title: string | null;
  repoOwner: string;
  repoName: string;
  branchName: string | null;
  status: string;
  sandboxStatus: string;
  messageCount: number;
  createdAt: number;
  model?: string;
  tunnelUrls?: Record<number, string>;
  activePorts?: number[];
}

interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  status: "active" | "idle" | "away";
  lastSeen: number;
}

interface SandboxEvent {
  type: string;
  tool?: string;
  args?: Record<string, unknown>;
  timestamp: number;
}

interface SessionRightSidebarProps {
  sessionState: SessionState | null;
  participants: Participant[];
  events: SandboxEvent[];
  artifacts: Artifact[];
  filesChanged?: FileChange[];
}

export function SessionRightSidebar({
  sessionState,
  participants,
  events,
  artifacts,
  filesChanged = [],
}: SessionRightSidebarProps) {
  // Extract latest tasks from TodoWrite events
  const tasks = useMemo(() => extractLatestTasks(events), [events]);

  if (!sessionState) {
    return <RightSidebarSkeleton />;
  }

  return (
    <aside className="w-80 border-l border-border-muted overflow-y-auto hidden lg:block">
      {/* Participants */}
      <div className="px-4 py-4 border-b border-border-muted">
        <ParticipantsSection participants={participants} />
      </div>

      {/* Metadata */}
      <div className="px-4 py-4 border-b border-border-muted">
        <MetadataSection
          createdAt={sessionState.createdAt}
          model={sessionState.model}
          branchName={sessionState.branchName || undefined}
          repoOwner={sessionState.repoOwner}
          repoName={sessionState.repoName}
          artifacts={artifacts}
        />
      </div>

      {/* Live Preview - only show when ports are detected in output */}
      {sessionState.tunnelUrls &&
        sessionState.activePorts &&
        sessionState.activePorts.length > 0 && (
          <CollapsibleSection title="Live Preview" defaultOpen={true}>
            <PreviewSection
              tunnelUrls={sessionState.tunnelUrls}
              activePorts={sessionState.activePorts}
            />
          </CollapsibleSection>
        )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <CollapsibleSection title="Tasks" defaultOpen={true}>
          <TasksSection tasks={tasks} />
        </CollapsibleSection>
      )}

      {/* Files Changed */}
      {filesChanged.length > 0 && (
        <CollapsibleSection title="Files changed" defaultOpen={true}>
          <FilesChangedSection files={filesChanged} />
        </CollapsibleSection>
      )}

      {/* Artifacts info when no specific sections are populated */}
      {tasks.length === 0 && filesChanged.length === 0 && artifacts.length === 0 && (
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Tasks and file changes will appear here as the agent works.
          </p>
        </div>
      )}
    </aside>
  );
}
