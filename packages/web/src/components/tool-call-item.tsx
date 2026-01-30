"use client";

import {
  Brain,
  FileSearch,
  FileText,
  Globe,
  HelpCircle,
  ListTodo,
  Minus,
  Pencil,
  Plus,
  Search,
  Terminal,
  Zap,
} from "lucide-react";
import type { SandboxEvent } from "@/lib/tool-formatters";
import { formatToolCall } from "@/lib/tool-formatters";

interface ToolCallItemProps {
  event: SandboxEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

function ToolIcon({ name }: { name: string | null }) {
  if (!name) return null;

  const iconClass = "size-3 text-muted-foreground";

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
    case "filesearch":
      return <FileSearch className={iconClass} />;
    case "globe":
      return <Globe className={iconClass} />;
    case "question":
      return <HelpCircle className={iconClass} />;
    case "brain":
      return <Brain className={iconClass} />;
    case "list":
      return <ListTodo className={iconClass} />;
    default:
      return <Zap className={iconClass} />;
  }
}

export function ToolCallItem({ event, isExpanded, onToggle }: ToolCallItemProps) {
  const formatted = formatToolCall(event);
  const { args, output } = formatted.getDetails();

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className="inline-flex items-center gap-2 py-1 group/collapsible max-w-full hover:bg-muted/50 cursor-pointer"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <Minus className="size-3 text-muted-foreground" />
          ) : (
            <>
              <Plus className="size-3 text-muted-foreground hidden group-hover/collapsible:block" />
              <div className="group-hover/collapsible:hidden">
                <ToolIcon name={formatted.icon} />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="text-sm truncate">
            <span>{formatted.toolName}</span>
          </div>
          {formatted.summary && (
            <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-1 py-0.5 rounded-md truncate max-w-[400px]">
              {formatted.summary}
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 ml-5 p-3 bg-muted/30 border border-border-muted rounded-md text-xs overflow-hidden">
          {formatted.showArgs && args && Object.keys(args).length > 0 && (
            <div className={output ? "mb-2" : ""}>
              <div className="sidebar-label mb-2">Arguments</div>
              <pre className="overflow-x-auto text-foreground whitespace-pre-wrap font-mono">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <pre className="overflow-x-auto max-h-48 text-foreground whitespace-pre-wrap font-mono">
                {output}
              </pre>
            </div>
          )}
          {(!formatted.showArgs || !args) && !output && (
            <span className="text-muted-foreground">No details available</span>
          )}
        </div>
      )}
    </div>
  );
}
