"use client";

import { Bot, MessageSquare, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { getToolIcon } from "@/lib/tool-icons";
import { cn } from "@/lib/utils";
import type { SandboxEvent, ToolCallSummary } from "@/types/session";
import { SafeMarkdown } from "./safe-markdown";

interface TaskCallItemProps {
  event: SandboxEvent;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Get human-readable title for a tool
 */
function getToolTitle(toolName: string): string {
  const normalized = toolName.charAt(0).toUpperCase() + toolName.slice(1).toLowerCase();
  switch (normalized) {
    case "Read":
      return "Read";
    case "Edit":
      return "Edit";
    case "Write":
      return "Write";
    case "Bash":
      return "Shell";
    case "Glob":
      return "Glob";
    case "Grep":
      return "Grep";
    case "Task":
      return "Agent";
    case "Webfetch":
      return "WebFetch";
    case "Todoread":
      return "Read Tasks";
    case "Todowrite":
      return "Update Tasks";
    case "Taskcreate":
      return "Create Task";
    case "Taskupdate":
      return "Update Task";
    case "Tasklist":
      return "List Tasks";
    case "Taskget":
      return "Get Task";
    case "Question":
      return "Question";
    default:
      return toolName;
  }
}

export function TaskCallItem({ event, isExpanded, onToggle }: TaskCallItemProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  const description = event.args?.description as string | undefined;
  const subagentType = event.args?.subagent_type as string | undefined;
  const prompt = event.args?.prompt as string | undefined;
  const output = event.output || event.result;

  // Get nested tool calls from metadata.summary (populated by OpenCode Task tool)
  const nestedTools = (event.metadata?.summary || []) as ToolCallSummary[];

  // DEBUG: Log Task event data
  console.log("[TaskCallItem] Event:", {
    tool: event.tool,
    status: event.status,
    hasMetadata: !!event.metadata,
    metadata: event.metadata,
    nestedToolsCount: nestedTools.length,
    args: event.args,
  });

  return (
    <div className="w-full">
      {/* Agent header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className="inline-flex items-center gap-2 py-1 group/collapsible max-w-full hover:bg-muted/50 cursor-pointer"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <Minus className="size-3 text-muted-foreground hidden group-hover/collapsible:block" />
          ) : (
            <Plus className="size-3 text-muted-foreground hidden group-hover/collapsible:block" />
          )}
          <div
            className={cn(
              isExpanded ? "group-hover/collapsible:hidden" : "group-hover/collapsible:hidden"
            )}
          >
            <Bot className="size-3 text-muted-foreground" />
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm">Agent</span>
          {subagentType && (
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded">
              {subagentType}
            </span>
          )}
          {description && (
            <span className="font-mono font-medium text-xs truncate max-w-[400px] text-muted-foreground">
              {description}
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="ml-1.5 pl-4 border-l border-border">
          {/* Prompt section */}
          {prompt && (
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowPrompt(!showPrompt)}
                onKeyDown={(e) => e.key === "Enter" && setShowPrompt(!showPrompt)}
                className="inline-flex items-center gap-2 py-1 group/prompt max-w-full hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex-shrink-0">
                  {showPrompt ? (
                    <Minus className="size-3 text-muted-foreground hidden group-hover/prompt:block" />
                  ) : null}
                  <MessageSquare
                    className={cn(
                      "size-3 text-muted-foreground",
                      showPrompt ? "group-hover/prompt:hidden" : ""
                    )}
                  />
                </div>
                <span className="text-sm">Prompt</span>
              </div>

              {showPrompt && (
                <div className="mt-2 font-mono text-xs whitespace-pre-wrap break-words text-foreground bg-muted/30 p-3 rounded-md border border-border">
                  <SafeMarkdown
                    content={prompt}
                    className="prose prose-sm prose-invert antialiased select-text text-pretty"
                  />
                </div>
              )}
            </div>
          )}

          {/* Nested tool calls from metadata.summary */}
          {nestedTools.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {nestedTools.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 py-0.5 text-sm text-muted-foreground"
                >
                  {getToolIcon(item.tool, "xs", "text-muted-foreground")}
                  <span>{getToolTitle(item.tool)}</span>
                  {item.state.title && (
                    <span className="font-mono text-xs truncate max-w-[300px]">
                      {item.state.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Final response */}
          {output && (
            <div className="mt-2">
              <SafeMarkdown
                content={output}
                className="prose prose-sm prose-invert antialiased select-text text-pretty break-words"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
