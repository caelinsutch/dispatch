"use client";

import {
  Box,
  ChevronRight,
  FileText,
  Folder,
  Globe,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Terminal,
} from "lucide-react";
import type { SandboxEvent } from "@/lib/tool-formatters";
import { formatToolCall } from "@/lib/tool-formatters";
import { cn } from "@/lib/utils";

interface ToolCallItemProps {
  event: SandboxEvent;
  isExpanded: boolean;
  onToggle: () => void;
  showTime?: boolean;
}

function ToolIcon({ name }: { name: string | null }) {
  if (!name) return null;

  const iconClass = "h-3.5 w-3.5 text-secondary-foreground";

  switch (name) {
    case "file":
      return <FileText className={iconClass} />;
    case "pencil":
      return <Pencil className={iconClass} />;
    case "plus":
      return <Plus className={iconClass} />;
    case "terminal":
      return <Terminal className={iconClass} />;
    case "search":
      return <Search className={iconClass} />;
    case "folder":
      return <Folder className={iconClass} />;
    case "box":
      return <Box className={iconClass} />;
    case "globe":
      return <Globe className={iconClass} />;
    case "question":
      return <HelpCircle className={iconClass} />;
    default:
      return null;
  }
}

export function ToolCallItem({ event, isExpanded, onToggle, showTime = true }: ToolCallItemProps) {
  const formatted = formatToolCall(event);
  const time = new Date(event.timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const { args, output } = formatted.getDetails();

  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 text-sm text-left text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-secondary-foreground transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
        <ToolIcon name={formatted.icon} />
        <span className="truncate">
          {formatted.toolName} {formatted.summary}
        </span>
        {showTime && (
          <span className="text-xs text-secondary-foreground flex-shrink-0 ml-auto">{time}</span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5 p-3 bg-card border border-border-muted text-xs overflow-hidden">
          {args && Object.keys(args).length > 0 && (
            <div className="mb-2">
              <div className="text-muted-foreground mb-1 font-medium">Arguments:</div>
              <pre className="overflow-x-auto text-foreground whitespace-pre-wrap">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <div className="text-muted-foreground mb-1 font-medium">Output:</div>
              <pre className="overflow-x-auto max-h-48 text-foreground whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          )}
          {!args && !output && (
            <span className="text-secondary-foreground">No details available</span>
          )}
        </div>
      )}
    </div>
  );
}
