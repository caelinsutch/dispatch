import type { SandboxEvent } from "@/types/session";

export type { SandboxEvent };

/**
 * Extract just the filename from a file path
 */
function basename(filePath: string | undefined): string {
  if (!filePath) return "unknown";
  const parts = filePath.split("/");
  return parts[parts.length - 1] || filePath;
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
function truncate(str: string | undefined, maxLen: number): string {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

/**
 * Count lines in a string
 */
function countLines(str: string | undefined): number {
  if (!str) return 0;
  return str.split("\n").length;
}

export interface FormattedToolCall {
  /** Tool name for display */
  toolName: string;
  /** Short summary for collapsed view */
  summary: string;
  /** Icon name or null */
  icon: string | null;
  /** Whether to show arguments in expanded view (most tools don't need this) */
  showArgs: boolean;
  /** Full details for expanded view - returns JSX-safe content */
  getDetails: () => { args?: Record<string, unknown>; output?: string };
}

/**
 * Extract hostname from URL
 */
function getHostname(url: string | undefined): string {
  if (!url) return "url";
  try {
    return new URL(url).hostname;
  } catch {
    return truncate(url, 30);
  }
}

/**
 * Format a tool call event for compact display
 * Note: OpenCode uses camelCase field names (filePath, not file_path)
 * Handles both capitalized (Read) and lowercase (read) tool names
 */
export function formatToolCall(event: SandboxEvent): FormattedToolCall {
  const { tool, args, output } = event;
  const rawToolName = tool || "Unknown";
  // Normalize to handle both "Read" and "read" style names
  const normalizedTool = rawToolName.charAt(0).toUpperCase() + rawToolName.slice(1).toLowerCase();

  switch (normalizedTool) {
    case "Read": {
      // OpenCode uses filePath (camelCase)
      const filePath = (args?.filePath ?? args?.file_path) as string | undefined;
      const lineCount = countLines(output);
      return {
        toolName: "Read",
        summary: filePath
          ? `${basename(filePath)}${lineCount > 0 ? ` (${lineCount} lines)` : ""}`
          : "file",
        icon: "file",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Edit": {
      const filePath = (args?.filePath ?? args?.file_path) as string | undefined;
      return {
        toolName: "Edit",
        summary: filePath ? basename(filePath) : "file",
        icon: "pencil",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Write": {
      const filePath = (args?.filePath ?? args?.file_path) as string | undefined;
      return {
        toolName: "Write",
        summary: filePath ? basename(filePath) : "file",
        icon: "plus",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Bash": {
      // Use description if available, otherwise show truncated command
      const description = args?.description as string | undefined;
      const command = args?.command as string | undefined;
      return {
        toolName: "Bash",
        summary: description ? truncate(description, 50) : truncate(command, 50),
        icon: "terminal",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Grep": {
      const pattern = args?.pattern as string | undefined;
      const include = args?.include as string | undefined;
      // Extract match count from output like "Found 29 matches"
      const matchCount = output?.match(/Found (\d+) matches/)?.[1];
      let summary = pattern ? `"${truncate(pattern, 20)}"` : "search";
      if (include) summary += ` in ${include}`;
      if (matchCount) summary += ` (${matchCount} matches)`;
      return {
        toolName: "Grep",
        summary,
        icon: "search",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Glob": {
      const pattern = args?.pattern as string | undefined;
      const fileCount = output ? output.split("\n").filter(Boolean).length : 0;
      return {
        toolName: "Glob",
        summary: pattern
          ? `${truncate(pattern, 30)}${fileCount > 0 ? ` (${fileCount} files)` : ""}`
          : "search",
        icon: "filesearch",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Task": {
      const description = args?.description as string | undefined;
      const subagentType = args?.subagent_type as string | undefined;
      const typeLabel = subagentType ? `[${subagentType}] ` : "";
      return {
        toolName: "Task",
        summary: description ? `${typeLabel}${truncate(description, 40)}` : "task",
        icon: "bot",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Webfetch": {
      const url = args?.url as string | undefined;
      return {
        toolName: "WebFetch",
        summary: `Fetch ${getHostname(url)}`,
        icon: "globe",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Websearch": {
      const query = args?.query as string | undefined;
      return {
        toolName: "WebSearch",
        summary: query ? `"${truncate(query, 40)}"` : "search",
        icon: "search",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Todoread": {
      return {
        toolName: "TodoRead",
        summary: "Read task list",
        icon: "list",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Todowrite": {
      const todos = args?.todos as unknown[] | undefined;
      const count = todos?.length ?? 0;
      return {
        toolName: "TodoWrite",
        summary: count > 0 ? `Update ${count} task${count === 1 ? "" : "s"}` : "Update tasks",
        icon: "list",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    case "Question": {
      const questions = args?.questions as { question?: string }[] | undefined;
      const firstQuestion = questions?.[0]?.question;
      return {
        toolName: "Question",
        summary: firstQuestion ? truncate(firstQuestion, 50) : "asking...",
        icon: "question",
        showArgs: false,
        getDetails: () => ({ args, output }),
      };
    }

    default:
      return {
        toolName: rawToolName,
        summary: args && Object.keys(args).length > 0 ? truncate(JSON.stringify(args), 50) : "",
        icon: null,
        showArgs: true, // Unknown tools show args since we don't have a good summary
        getDetails: () => ({ args, output }),
      };
  }
}

/**
 * Get a compact summary for a group of tool calls
 */
export function formatToolGroup(events: SandboxEvent[]): {
  toolName: string;
  count: number;
  summary: string;
} {
  if (events.length === 0) {
    return { toolName: "Unknown", count: 0, summary: "" };
  }

  const toolName = events[0].tool || "Unknown";
  const count = events.length;

  // Build summary based on tool type
  switch (toolName) {
    case "Read": {
      const _files = events
        .map((e) => basename(e.args?.file_path as string | undefined))
        .filter(Boolean);
      return {
        toolName: "Read",
        count,
        summary: `${count} file${count === 1 ? "" : "s"}`,
      };
    }

    case "Edit": {
      return {
        toolName: "Edit",
        count,
        summary: `${count} file${count === 1 ? "" : "s"}`,
      };
    }

    case "Bash": {
      return {
        toolName: "Bash",
        count,
        summary: `${count} command${count === 1 ? "" : "s"}`,
      };
    }

    default:
      return {
        toolName,
        count,
        summary: `${count} call${count === 1 ? "" : "s"}`,
      };
  }
}
