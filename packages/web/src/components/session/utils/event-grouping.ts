import type { SandboxEvent } from "@/types/session";

// Event grouping types
export type EventGroup =
  | { type: "tool_group"; events: SandboxEvent[]; id: string }
  | { type: "question"; event: SandboxEvent; id: string }
  | { type: "single"; event: SandboxEvent; id: string };

// Message chain type - groups all assistant activity between user messages
export interface MessageChainGroup {
  id: string;
  events: SandboxEvent[];
  groups: EventGroup[];
  isComplete: boolean;
}

// Render item type - can be user message or chain
export type RenderItem =
  | { type: "user_message"; event: SandboxEvent; id: string }
  | { type: "chain"; chain: MessageChainGroup; id: string };

// Group consecutive tool calls of the same type
export function groupEvents(events: SandboxEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  let currentToolGroup: SandboxEvent[] = [];
  let eventCounter = 0;

  const flushToolGroup = () => {
    if (currentToolGroup.length > 0) {
      const firstEvent = currentToolGroup[0];
      groups.push({
        type: "tool_group",
        events: [...currentToolGroup],
        id: `tool-group-${firstEvent.callId || firstEvent.timestamp}`,
      });
      currentToolGroup = [];
    }
  };

  for (const event of events) {
    if (event.type === "tool_call") {
      if (event.tool === "question") {
        flushToolGroup();
        groups.push({
          type: "question",
          event,
          id: `question-${event.callId || event.timestamp}`,
        });
      } else if (currentToolGroup.length > 0 && currentToolGroup[0].tool === event.tool) {
        currentToolGroup.push(event);
      } else {
        flushToolGroup();
        currentToolGroup = [event];
      }
    } else {
      flushToolGroup();
      eventCounter++;
      groups.push({
        type: "single",
        event,
        id: `single-${event.type}-${event.messageId || event.callId || event.timestamp}-${eventCounter}`,
      });
    }
  }

  flushToolGroup();

  return groups;
}

// Group events into message chains - all assistant activity between user messages
export function groupIntoMessageChains(
  events: SandboxEvent[],
  isProcessing: boolean
): RenderItem[] {
  const items: RenderItem[] = [];
  let currentChainEvents: SandboxEvent[] = [];
  let chainCounter = 0;

  const flushChain = (isComplete: boolean) => {
    if (currentChainEvents.length > 0) {
      const groups = groupEvents(currentChainEvents);
      const chainId = `chain-${chainCounter++}`;
      items.push({
        type: "chain",
        chain: {
          id: chainId,
          events: [...currentChainEvents],
          groups,
          isComplete,
        },
        id: chainId,
      });
      currentChainEvents = [];
    }
  };

  for (const event of events) {
    if (event.type === "user_message") {
      flushChain(true);
      items.push({
        type: "user_message",
        event,
        id: `user-${event.messageId || event.timestamp}`,
      });
    } else if (event.type === "execution_complete") {
      currentChainEvents.push(event);
      flushChain(true);
    } else {
      currentChainEvents.push(event);
    }
  }

  if (currentChainEvents.length > 0) {
    flushChain(!isProcessing);
  }

  return items;
}
