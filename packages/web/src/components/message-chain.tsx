"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getToolIcon } from "@/lib/tool-icons";
import { cn } from "@/lib/utils";
import type { SandboxEvent } from "@/types/session";

export interface MessageChainProps {
  /** All events in this chain (tool calls, tokens, etc.) */
  events: SandboxEvent[];
  /** Whether this chain is complete (execution_complete received) */
  isComplete: boolean;
  /** Content to hide/show when collapsed (tool calls, intermediate messages) */
  collapsibleContent: React.ReactNode;
  /** Final message content that's always visible */
  finalContent?: React.ReactNode;
}

// Analyze events to get chain statistics
function analyzeChain(events: SandboxEvent[]) {
  const toolCalls = events.filter((e) => e.type === "tool_call");

  // Get unique tool types
  const toolTypes = new Set<string>();
  for (const event of toolCalls) {
    if (event.tool) {
      toolTypes.add(event.tool);
    }
  }

  return {
    toolCallCount: toolCalls.length,
    toolTypes: Array.from(toolTypes),
  };
}

export function MessageChain({
  events,
  isComplete,
  collapsibleContent,
  finalContent,
}: MessageChainProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [wasManuallyExpanded, setWasManuallyExpanded] = useState(false);

  const { toolCallCount, toolTypes } = analyzeChain(events);

  // Auto-collapse when chain completes, unless user manually expanded it
  useEffect(() => {
    if (isComplete && !wasManuallyExpanded && toolCallCount > 0) {
      setIsExpanded(false);
    }
  }, [isComplete, wasManuallyExpanded, toolCallCount]);

  // Don't wrap chains with no tool calls - just render content directly
  if (toolCallCount === 0) {
    return (
      <>
        {collapsibleContent}
        {finalContent}
      </>
    );
  }

  // While processing (not complete), render tools directly without accordion
  if (!isComplete) {
    return (
      <>
        {collapsibleContent}
        {finalContent}
      </>
    );
  }

  // Build summary text - only show tool calls count
  const summaryText = `${toolCallCount} tool call${toolCallCount !== 1 ? "s" : ""}`;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setWasManuallyExpanded(true);
    }
  };

  return (
    <div className="message-chain">
      {/* Collapsed summary header */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2 py-2 cursor-pointer select-none w-full text-left",
          "text-muted-foreground hover:text-foreground transition-colors"
        )}
      >
        <ChevronRight
          className={cn(
            "size-4 transition-transform duration-200 flex-shrink-0",
            isExpanded && "rotate-90"
          )}
        />
        <span className="text-sm font-medium">{summaryText}</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          {toolTypes.map((tool) => (
            <span key={tool} title={tool}>
              {getToolIcon(tool)}
            </span>
          ))}
        </div>
      </button>

      {/* Collapsible content (tool calls, intermediate messages) - indented to align with header text */}
      {isExpanded && <div className="message-chain-content ml-6">{collapsibleContent}</div>}

      {/* Final message - always visible */}
      {finalContent}
    </div>
  );
}
