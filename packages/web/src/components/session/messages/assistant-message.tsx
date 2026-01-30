import { MessageFooter } from "@/components/message-footer";
import { SafeMarkdown } from "@/components/safe-markdown";

interface AssistantMessageProps {
  content: string;
  chainStartTime?: number;
  chainEndTime?: number;
  chainIsComplete?: boolean;
}

export function AssistantMessage({
  content,
  chainStartTime,
  chainEndTime,
  chainIsComplete,
}: AssistantMessageProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const executionTime =
    chainIsComplete && chainStartTime && chainEndTime ? chainEndTime - chainStartTime : undefined;

  return (
    <div className="flex justify-start relative">
      <div className="flex flex-col w-full max-w-xl lg:max-w-3xl space-y-1 break-words">
        <div className="my-1">
          <SafeMarkdown
            content={content}
            className="prose prose-sm dark:prose-invert antialiased select-text text-pretty"
          />
        </div>
        <MessageFooter
          onCopy={handleCopy}
          showUndo={false}
          startTime={chainStartTime}
          isLive={!chainIsComplete}
          executionTime={executionTime}
        />
      </div>
    </div>
  );
}
