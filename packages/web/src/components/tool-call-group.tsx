"use client";

import {
  Brain,
  ChevronRight,
  FileSearch,
  FileText,
  Globe,
  ListTodo,
  Pencil,
  Search,
  Terminal,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { SandboxEvent } from "@/lib/tool-formatters";
import { formatToolGroup } from "@/lib/tool-formatters";
import { cn } from "@/lib/utils";
import { type FileChange, MessageFooter } from "./message-footer";
import { ToolCallItem } from "./tool-call-item";

interface ToolCallGroupProps {
  events: SandboxEvent[];
  groupId: string;
}

function ToolIcon({ toolName }: { toolName: string }) {
  const iconClass = "size-3 text-muted-foreground group-hover:text-foreground";
  // Normalize to handle both "Read" and "read" style names
  const normalized = toolName.charAt(0).toUpperCase() + toolName.slice(1).toLowerCase();

  switch (normalized) {
    case "Read":
      return <FileText className={iconClass} />;
    case "Edit":
      return <Pencil className={iconClass} />;
    case "Write":
      return <Pencil className={iconClass} />;
    case "Bash":
      return <Terminal className={iconClass} />;
    case "Glob":
      return <FileSearch className={iconClass} />;
    case "Grep":
      return <Search className={iconClass} />;
    case "Task":
      return <Brain className={iconClass} />;
    case "Webfetch":
      return <Globe className={iconClass} />;
    case "Todoread":
    case "Todowrite":
      return <ListTodo className={iconClass} />;
    default:
      return <Zap className={iconClass} />;
  }
}

// Get unique tool types from events
function getUniqueToolTypes(events: SandboxEvent[]): string[] {
  const tools = new Set<string>();
  for (const event of events) {
    if (event.tool) {
      tools.add(event.tool);
    }
  }
  return Array.from(tools);
}

// Extract file changes from Edit/Write tool calls
function extractFileChanges(events: SandboxEvent[]): FileChange[] {
  const changes: FileChange[] = [];

  for (const event of events) {
    if ((event.tool === "Edit" || event.tool === "Write") && event.args) {
      const filePath = event.args.file_path as string | undefined;
      if (filePath) {
        // Estimate additions/deletions from old_string and new_string
        const oldString = (event.args.old_string as string) || "";
        const newString = (event.args.new_string as string) || (event.args.content as string) || "";

        const oldLines = oldString ? oldString.split("\n").length : 0;
        const newLines = newString ? newString.split("\n").length : 0;

        changes.push({
          filename: filePath,
          additions: Math.max(0, newLines - (event.tool === "Write" ? 0 : oldLines)),
          deletions: event.tool === "Write" ? 0 : oldLines,
        });
      }
    }
  }

  return changes;
}

// Calculate execution time from first to last event
function calculateExecutionTime(events: SandboxEvent[]): number | undefined {
  if (events.length < 2) return undefined;

  const firstTimestamp = events[0].timestamp;
  const lastTimestamp = events[events.length - 1].timestamp;

  const duration = lastTimestamp - firstTimestamp;
  return duration > 0 ? duration : undefined;
}

export function ToolCallGroup({ events, groupId }: ToolCallGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatted = formatToolGroup(events);
  const firstEvent = events[0];
  const uniqueTools = getUniqueToolTypes(events);
  const fileChanges = extractFileChanges(events);
  const executionTime = calculateExecutionTime(events);

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleCopy = () => {
    // Copy tool call summaries to clipboard
    const summary = events
      .map((e) => `${e.tool}: ${JSON.stringify(e.args)}`)
      .join("\n");
    navigator.clipboard.writeText(summary);
  };

  // For single tool call, render directly without group wrapper
  if (events.length === 1) {
    const singleFileChanges = extractFileChanges([firstEvent]);
    return (
      <div>
        <ToolCallItem
          event={firstEvent}
          isExpanded={expandedItems.has(`${groupId}-0`)}
          onToggle={() => toggleItem(`${groupId}-0`)}
        />
        {singleFileChanges.length > 0 && (
          <MessageFooter
            fileChanges={singleFileChanges}
            onCopy={handleCopy}
            showUndo={false}
          />
        )}
      </div>
    );
  }

  return (
    <div className="py-1">
      <div className="w-full flex items-center text-muted-foreground hover:text-foreground mb-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center"
        >
          <ChevronRight
            className={cn(
              "w-3 h-3 mr-1 transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
        </button>
        <div className="flex items-center justify-between w-full">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => e.key === "Enter" && setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="text-sm ml-0.5">
              {events.length} tool call{events.length !== 1 ? "s" : ""}, {formatted.summary}
            </div>
            <div className="flex items-center gap-1">
              {uniqueTools.map((tool) => (
                <ToolIcon key={tool} toolName={tool} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-1">
          {events.map((event, index) => (
            <ToolCallItem
              key={`${groupId}-${index}`}
              event={event}
              isExpanded={expandedItems.has(`${groupId}-${index}`)}
              onToggle={() => toggleItem(`${groupId}-${index}`)}
            />
          ))}
        </div>
      )}

      {(fileChanges.length > 0 || executionTime) && (
        <MessageFooter
          executionTime={executionTime}
          fileChanges={fileChanges}
          onCopy={handleCopy}
          showUndo={false}
        />
      )}
    </div>
  );
}
