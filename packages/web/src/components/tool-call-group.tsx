"use client";

import { ChevronRight, FileText, Pencil, Terminal, Zap } from "lucide-react";
import { useState } from "react";
import type { SandboxEvent } from "@/lib/tool-formatters";
import { formatToolGroup } from "@/lib/tool-formatters";
import { cn } from "@/lib/utils";
import { ToolCallItem } from "./tool-call-item";

interface ToolCallGroupProps {
  events: SandboxEvent[];
  groupId: string;
}

function ToolIcon({ toolName }: { toolName: string }) {
  const iconClass = "h-3.5 w-3.5 text-secondary-foreground";

  switch (toolName) {
    case "Read":
      return <FileText className={iconClass} />;
    case "Edit":
      return <Pencil className={iconClass} />;
    case "Bash":
      return <Terminal className={iconClass} />;
    default:
      return <Zap className={iconClass} />;
  }
}

export function ToolCallGroup({ events, groupId }: ToolCallGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatted = formatToolGroup(events);
  const firstEvent = events[0];
  const _lastEvent = events[events.length - 1];

  const time = new Date(firstEvent.timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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

  // For single tool call, render directly without group wrapper
  if (events.length === 1) {
    return (
      <ToolCallItem
        event={firstEvent}
        isExpanded={expandedItems.has(`${groupId}-0`)}
        onToggle={() => toggleItem(`${groupId}-0`)}
      />
    );
  }

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 text-sm text-left hover:bg-muted px-2 py-1 -mx-2 transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-secondary-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
        <ToolIcon toolName={formatted.toolName} />
        <span className="font-medium text-foreground">{formatted.toolName}</span>
        <span className="text-muted-foreground">{formatted.summary}</span>
        <span className="text-xs text-secondary-foreground ml-auto flex-shrink-0">{time}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 pl-2 border-l-2 border-border">
          {events.map((event, index) => (
            <ToolCallItem
              key={`${groupId}-${index}`}
              event={event}
              isExpanded={expandedItems.has(`${groupId}-${index}`)}
              onToggle={() => toggleItem(`${groupId}-${index}`)}
              showTime={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
