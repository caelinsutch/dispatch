"use client";

import { useEffect, useMemo, useRef } from "react";
import { MessageChain } from "@/components/message-chain";
import type { QuestionInfo } from "@/components/question-card";
import { AnsweredQuestion } from "@/components/question-card";
import { ToolCallGroup } from "@/components/tool-call-group";
import { MessageListSkeleton } from "@/components/ui/skeleton";
import type { SandboxEvent } from "@/types/session";
import { AssistantMessage, ErrorMessage, GitSyncMessage, UserMessage } from "./messages";
import { type EventGroup, groupIntoMessageChains, type RenderItem } from "./utils/event-grouping";

interface MessageListProps {
  events: SandboxEvent[];
  isProcessing: boolean;
  isConnecting: boolean;
  currentParticipantId: string | null;
  uniqueParticipantCount: number;
  answeredQuestions: Map<string, { questions: QuestionInfo[]; answers: string[][] }>;
}

export function MessageList({
  events,
  isProcessing,
  isConnecting,
  currentParticipantId,
  uniqueParticipantCount,
  answeredQuestions,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevEventsLengthRef = useRef(0);

  // Auto-scroll on new events
  useEffect(() => {
    const isNewEvent = events.length > prevEventsLengthRef.current;
    const isNotInitialLoad = prevEventsLengthRef.current > 0;
    if (isNewEvent && isNotInitialLoad && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    prevEventsLengthRef.current = events.length;
  }, [events]);

  const renderItems = useMemo(
    () => groupIntoMessageChains(events, isProcessing),
    [events, isProcessing]
  );

  const showAttribution = uniqueParticipantCount > 1;

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-2">
        {isConnecting && events.length === 0 && <MessageListSkeleton />}
        {renderItems.map((item) => (
          <MessageListItem
            key={item.id}
            item={item}
            currentParticipantId={currentParticipantId}
            showAttribution={showAttribution}
            answeredQuestions={answeredQuestions}
          />
        ))}
        {isProcessing && <ThinkingIndicator />}
      </div>
    </div>
  );
}

interface MessageListItemProps {
  item: RenderItem;
  currentParticipantId: string | null;
  showAttribution: boolean;
  answeredQuestions: Map<string, { questions: QuestionInfo[]; answers: string[][] }>;
}

function MessageListItem({
  item,
  currentParticipantId,
  showAttribution,
  answeredQuestions,
}: MessageListItemProps) {
  if (item.type === "user_message") {
    const { event } = item;
    if (!event.content) return null;

    return (
      <UserMessage
        content={event.content}
        author={event.author}
        currentParticipantId={currentParticipantId}
        showAttribution={showAttribution}
      />
    );
  }

  // Render message chain
  const { chain } = item;

  const chainStartTime = chain.events.length > 0 ? chain.events[0].timestamp : undefined;
  const chainEndTime =
    chain.events.length > 0 ? chain.events[chain.events.length - 1].timestamp : undefined;

  // Find the last token group (final message to always show)
  let lastTokenGroupIndex = -1;
  for (let i = chain.groups.length - 1; i >= 0; i--) {
    const g = chain.groups[i];
    if (g.type === "single" && g.event.type === "token") {
      lastTokenGroupIndex = i;
      break;
    }
  }

  const collapsibleGroups =
    lastTokenGroupIndex >= 0 ? chain.groups.slice(0, lastTokenGroupIndex) : chain.groups;
  const finalGroup = lastTokenGroupIndex >= 0 ? chain.groups[lastTokenGroupIndex] : null;

  const renderGroup = (group: EventGroup) => (
    <EventGroupRenderer
      key={group.id}
      group={group}
      chainStartTime={chainStartTime}
      chainEndTime={chainEndTime}
      chainIsComplete={chain.isComplete}
      answeredQuestions={answeredQuestions}
    />
  );

  return (
    <MessageChain
      events={chain.events}
      isComplete={chain.isComplete}
      collapsibleContent={collapsibleGroups.map(renderGroup)}
      finalContent={finalGroup ? renderGroup(finalGroup) : undefined}
    />
  );
}

interface EventGroupRendererProps {
  group: EventGroup;
  chainStartTime?: number;
  chainEndTime?: number;
  chainIsComplete: boolean;
  answeredQuestions: Map<string, { questions: QuestionInfo[]; answers: string[][] }>;
}

function EventGroupRenderer({
  group,
  chainStartTime,
  chainEndTime,
  chainIsComplete,
  answeredQuestions,
}: EventGroupRendererProps) {
  if (group.type === "tool_group") {
    return <ToolCallGroup events={group.events} groupId={group.id} />;
  }

  if (group.type === "question") {
    const { event } = group;
    const requestId = (event.args?.id as string) || event.callId || group.id;
    const answered = answeredQuestions.get(requestId);

    if (answered) {
      return <AnsweredQuestion questions={answered.questions} answers={answered.answers} />;
    }
    return null;
  }

  // Single event
  const { event } = group;

  switch (event.type) {
    case "token":
      if (!event.content) return null;
      return (
        <AssistantMessage
          content={event.content}
          chainStartTime={chainStartTime}
          chainEndTime={chainEndTime}
          chainIsComplete={chainIsComplete}
        />
      );

    case "tool_result":
      if (!event.error) return null;
      return <ErrorMessage error={event.error} timestamp={event.timestamp} />;

    case "git_sync":
      return <GitSyncMessage status={event.status || ""} timestamp={event.timestamp} />;

    default:
      return null;
  }
}

function ThinkingIndicator() {
  return (
    <div className="bg-card p-4 flex items-center gap-2">
      <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />
      <span className="text-sm text-muted-foreground">Thinking...</span>
    </div>
  );
}
