"use client";

import {
  Brain,
  FileSearch,
  FileText,
  Globe,
  ListTodo,
  MessageSquareMore,
  Pencil,
  Plus,
  Search,
  Terminal,
  Zap,
} from "lucide-react";

/**
 * Centralized tool icon mapping.
 * Used by: message-chain.tsx, tool-call-group.tsx, tool-call-item.tsx
 *
 * This ensures consistent icons across all tool-related UI components.
 */

export type IconSize = "xs" | "sm" | "md";

const sizeClasses: Record<IconSize, string> = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
};

/**
 * Get the appropriate icon component for a tool.
 *
 * @param toolName - The raw tool name (e.g., "Read", "mcp__conductor__AskUserQuestion")
 * @param size - Icon size: "xs" (12px), "sm" (14px), "md" (16px)
 * @param className - Additional CSS classes
 */
export function getToolIcon(
  toolName: string,
  size: IconSize = "sm",
  className?: string
): React.ReactNode {
  const iconClass = `${sizeClasses[size]} ${className || ""}`.trim();
  const lowerName = toolName.toLowerCase();

  // Handle MCP tools (e.g., mcp__conductor__AskUserQuestion)
  if (lowerName.includes("askuserquestion")) {
    return <MessageSquareMore className={iconClass} />;
  }
  if (lowerName.includes("getworkspacediff") || lowerName.includes("diffcomment")) {
    return <FileText className={iconClass} />;
  }
  if (lowerName.includes("getterminaloutput")) {
    return <Terminal className={iconClass} />;
  }

  // Standard tools (normalize case)
  const normalized = toolName.charAt(0).toUpperCase() + toolName.slice(1).toLowerCase();

  switch (normalized) {
    case "Read":
      return <FileText className={iconClass} />;
    case "Edit":
      return <Pencil className={iconClass} />;
    case "Write":
      return <Plus className={iconClass} />;
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
    case "Taskcreate":
    case "Taskupdate":
    case "Tasklist":
    case "Taskget":
      return <ListTodo className={iconClass} />;
    case "Skill":
      return <Brain className={iconClass} />;
    case "Question":
      return <MessageSquareMore className={iconClass} />;
    default:
      return <Zap className={iconClass} />;
  }
}

/**
 * Map from icon name strings (used by tool-formatters.ts) to icon components.
 * This bridges the gap between formatToolCall().icon and actual rendering.
 */
export function getIconByName(
  iconName: string | null,
  size: IconSize = "sm",
  className?: string
): React.ReactNode {
  if (!iconName) return <Zap className={`${sizeClasses[size]} ${className || ""}`.trim()} />;

  const iconClass = `${sizeClasses[size]} ${className || ""}`.trim();

  switch (iconName) {
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
      return <MessageSquareMore className={iconClass} />;
    case "brain":
      return <Brain className={iconClass} />;
    case "list":
      return <ListTodo className={iconClass} />;
    default:
      return <Zap className={iconClass} />;
  }
}
