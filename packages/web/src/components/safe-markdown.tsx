"use client";

import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";

interface SafeMarkdownProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function SafeMarkdown({ content, className = "", isStreaming = false }: SafeMarkdownProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none text-foreground ${className}`}>
      <Streamdown plugins={{ code }} isAnimating={isStreaming}>
        {content}
      </Streamdown>
    </div>
  );
}
