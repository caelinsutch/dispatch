"use client";

import { Check, PanelLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Composer, type PendingQuestion } from "@/components/composer";
import { MessageChain } from "@/components/message-chain";
import { MessageFooter } from "@/components/message-footer";
import type { QuestionInfo } from "@/components/question-card";
import { AnsweredQuestion } from "@/components/question-card";
import { SafeMarkdown } from "@/components/safe-markdown";
import { SessionRightSidebar } from "@/components/session-right-sidebar";
import { useRightPanelContext, useSidebarContext } from "@/components/sidebar-layout";
import { ToolCallGroup } from "@/components/tool-call-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeaderSkeleton, MessageListSkeleton } from "@/components/ui/skeleton";
import { SessionContext, useSessionSocket } from "@/hooks/use-session-socket";
import { useSessionsContext } from "@/hooks/use-sessions";
import { authClient } from "@/lib/auth-client";
import { formatModelNameShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SandboxEvent } from "@/types/session";

// Hook to access session context
function useSession() {
  const context = use(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionContext");
  }
  return context;
}

// Event grouping types
type EventGroup =
  | { type: "tool_group"; events: SandboxEvent[]; id: string }
  | { type: "question"; event: SandboxEvent; id: string }
  | { type: "single"; event: SandboxEvent; id: string };

// Message chain type - groups all assistant activity between user messages
interface MessageChainGroup {
  id: string;
  events: SandboxEvent[];
  groups: EventGroup[];
  isComplete: boolean;
}

// Group consecutive tool calls of the same type
function groupEvents(events: SandboxEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  let currentToolGroup: SandboxEvent[] = [];
  let eventCounter = 0; // Counter for unique keys

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

// Render item type - can be user message or chain
type RenderItem =
  | { type: "user_message"; event: SandboxEvent; id: string }
  | { type: "chain"; chain: MessageChainGroup; id: string };

// Group events into message chains - all assistant activity between user messages
function groupIntoMessageChains(events: SandboxEvent[], isProcessing: boolean): RenderItem[] {
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
      // Flush current chain as complete before user message
      flushChain(true);
      items.push({
        type: "user_message",
        event,
        id: `user-${event.messageId || event.timestamp}`,
      });
    } else if (event.type === "execution_complete") {
      // Mark chain as complete but don't include the event in display
      currentChainEvents.push(event);
      flushChain(true);
    } else {
      // Add to current chain
      currentChainEvents.push(event);
    }
  }

  // Flush remaining events - not complete if still processing
  if (currentChainEvents.length > 0) {
    flushChain(!isProcessing);
  }

  return items;
}

// Model options configuration
interface ModelOption {
  id: string;
  name: string;
  description: string;
  category?: string;
}

const MODEL_OPTIONS: { category: string; models: ModelOption[] }[] = [
  {
    category: "Model",
    models: [
      {
        id: "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0",
        name: "Claude Opus 4.5",
        description: "Most capable",
      },
      {
        id: "amazon-bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0",
        name: "Claude Sonnet 4.5",
        description: "Balanced performance",
      },
    ],
  },
];

function ModelOptionButton({
  model,
  isSelected,
  onSelect,
}: {
  model: ModelOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition ${
        isSelected ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      <div className="flex flex-col items-start">
        <span className="font-medium">{model.name}</span>
        <span className="text-xs text-secondary-foreground">{model.description}</span>
      </div>
      {isSelected && <Check className="h-4 w-4 text-accent" />}
    </button>
  );
}

export default function SessionPage() {
  const { data: _authSession, isPending: authPending } = authClient.useSession();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const session = useSessionSocket(sessionId);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authPending && !_authSession) {
      router.push("/");
    }
  }, [authPending, _authSession, router]);

  if (authPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  return (
    <SessionContext value={session}>
      <SessionContent />
    </SessionContext>
  );
}

function SessionContent() {
  const {
    connected,
    connecting,
    authError,
    connectionError,
    sessionState,
    events,
    participants,
    artifacts,
    filesChanged,
    currentParticipantId,
    isProcessing,
    sendPrompt,
    sendQuestionAnswer,
    stopExecution,
    sendTyping,
    reconnect,
  } = useSession();

  const { isOpen, toggle } = useSidebarContext();
  const { setRightPanelContent } = useRightPanelContext();
  const { updateSession } = useSessionsContext();

  // Compute total additions/deletions from file changes
  const diffStats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const file of filesChanged) {
      additions += file.additions;
      deletions += file.deletions;
    }
    return { additions, deletions };
  }, [filesChanged]);

  // Sync session data to sidebar when WebSocket connects with fresh data
  // This updates the sidebar with the real title from the Durable Object
  // (the API returns stale KV data, so we need to sync from WebSocket)
  useEffect(() => {
    if (sessionState?.id) {
      updateSession(sessionState.id, {
        title: sessionState.title,
        status: sessionState.status,
        branchName: sessionState.branchName,
        repoOwner: sessionState.repoOwner,
        repoName: sessionState.repoName,
        createdAt: sessionState.createdAt,
        updatedAt: Date.now(),
        additions: diffStats.additions,
        deletions: diffStats.deletions,
      });
    }
  }, [
    sessionState?.id,
    sessionState?.title,
    sessionState?.status,
    sessionState?.branchName,
    sessionState?.repoOwner,
    sessionState?.repoName,
    sessionState?.createdAt,
    diffStats.additions,
    diffStats.deletions,
    updateSession,
  ]);

  // Local UI state
  const [selectedModel, setSelectedModel] = useState(
    "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0"
  );
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [planEnabled, setPlanEnabled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const prevEventsLengthRef = useRef(0);

  // Derive answered questions from events (questions with status="completed")
  const answeredQuestions = useMemo(() => {
    const answered = new Map<string, { questions: QuestionInfo[]; answers: string[][] }>();
    for (const event of events) {
      if (
        event.type === "tool_call" &&
        event.tool === "question" &&
        event.status === "completed" &&
        event.output
      ) {
        const requestId = (event.args?.id as string) || event.callId || "";
        const questions = (event.args?.questions as QuestionInfo[]) || [];
        try {
          const parsedOutput = JSON.parse(event.output);
          const answers = Array.isArray(parsedOutput) ? parsedOutput : [[parsedOutput]];
          answered.set(requestId, { questions, answers });
        } catch {
          // Try to parse the verbose output format: "Question"="Answer", "Question2"="Answer2"
          const extractedAnswers: string[][] = [];
          for (const q of questions) {
            // Look for pattern: "question text"="answer text"
            const escapedQuestion = q.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(`"${escapedQuestion}"\\s*=\\s*"([^"]*)"`, "i");
            const match = event.output.match(pattern);
            if (match) {
              extractedAnswers.push([match[1]]);
            } else {
              extractedAnswers.push([]);
            }
          }
          // If we extracted any answers, use them; otherwise fall back to empty
          const hasAnswers = extractedAnswers.some((a) => a.length > 0);
          answered.set(requestId, {
            questions,
            answers: hasAnswers ? extractedAnswers : questions.map(() => []),
          });
        }
      }
    }
    return answered;
  }, [events]);

  // Derive pending question (first unanswered question) for the composer
  const pendingQuestion: PendingQuestion | null = useMemo(() => {
    for (const event of events) {
      if (event.type === "tool_call" && event.tool === "question" && event.status !== "completed") {
        const requestId = (event.args?.id as string) || event.callId || "";
        // Check if this question has been answered
        if (!answeredQuestions.has(requestId)) {
          const questions = (event.args?.questions as QuestionInfo[]) || [];
          if (questions.length > 0) {
            return { requestId, questions };
          }
        }
      }
    }
    return null;
  }, [events, answeredQuestions]);

  // Archive handlers (still REST for now - session mutations)
  const handleArchive = useCallback(async () => {
    if (!sessionState?.id) return;
    try {
      const response = await fetch(`/api/sessions/${sessionState.id}/archive`, { method: "POST" });
      if (!response.ok) console.error("Failed to archive session");
    } catch (error) {
      console.error("Failed to archive session:", error);
    }
  }, [sessionState?.id]);

  const handleUnarchive = useCallback(async () => {
    if (!sessionState?.id) return;
    try {
      const response = await fetch(`/api/sessions/${sessionState.id}/unarchive`, {
        method: "POST",
      });
      if (!response.ok) console.error("Failed to unarchive session");
    } catch (error) {
      console.error("Failed to unarchive session:", error);
    }
  }, [sessionState?.id]);

  // Handle question answer via WebSocket
  const handleQuestionAnswer = useCallback(
    (requestId: string, answers: string[][]) => {
      sendQuestionAnswer(requestId, answers);
    },
    [sendQuestionAnswer]
  );

  // Auto-scroll on new events
  useEffect(() => {
    const isNewEvent = events.length > prevEventsLengthRef.current;
    const isNotInitialLoad = prevEventsLengthRef.current > 0;
    if (isNewEvent && isNotInitialLoad && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    prevEventsLengthRef.current = events.length;
  }, [events]);

  // Close model dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set up right panel content
  useEffect(() => {
    setRightPanelContent(
      <SessionRightSidebar
        sessionState={sessionState}
        participants={participants}
        events={events}
        artifacts={artifacts}
      />
    );

    return () => {
      setRightPanelContent(null);
    };
  }, [sessionState, participants, events, artifacts, setRightPanelContent]);

  // Check if sandbox is ready to accept messages
  const sandboxReady =
    sessionState?.sandboxStatus === "ready" || sessionState?.sandboxStatus === "running";

  // Composer handlers
  const handlePromptSubmit = useCallback(
    (prompt: string) => {
      if (!prompt.trim() || isProcessing || !sandboxReady) return;
      sendPrompt(prompt, selectedModel);
      // Trigger typing indicator
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTyping(), 300);
    },
    [isProcessing, sandboxReady, selectedModel, sendPrompt, sendTyping]
  );

  // Group events into message chains for rendering
  const renderItems = useMemo(
    () => groupIntoMessageChains(events, isProcessing),
    [events, isProcessing]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      {!sessionState ? (
        <HeaderSkeleton />
      ) : (
        <header className="h-12 px-4 flex items-center justify-between border-b border-border-muted flex-shrink-0">
            <div className="flex items-center gap-3">
              {!isOpen && (
                <button
                  onClick={toggle}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  title="Open sidebar"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h1 className="text-sm font-medium text-foreground">
                  {sessionState.title || `${sessionState.repoOwner}/${sessionState.repoName}`}
                </h1>
              </div>
            </div>
            <SessionStatus
              connected={connected}
              connecting={connecting}
              sandboxStatus={sessionState.sandboxStatus}
            />
        </header>
      )}

      {/* Connection error banner */}
      {(authError || connectionError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{authError || connectionError}</p>
          <button
            onClick={reconnect}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {/* Event timeline */}
        <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-2">
            {connecting && events.length === 0 && <MessageListSkeleton />}
            {renderItems.map((item) => {
              if (item.type === "user_message") {
                return (
                  <EventItem
                    key={item.id}
                    event={item.event}
                    currentParticipantId={currentParticipantId}
                  />
                );
              }
              // Render message chain
              const { chain } = item;

              // Calculate chain timing
              const chainStartTime =
                chain.events.length > 0 ? chain.events[0].timestamp : undefined;
              const chainEndTime =
                chain.events.length > 0
                  ? chain.events[chain.events.length - 1].timestamp
                  : undefined;

              // Find the last token group (final message to always show)
              let lastTokenGroupIndex = -1;
              for (let i = chain.groups.length - 1; i >= 0; i--) {
                const g = chain.groups[i];
                if (g.type === "single" && g.event.type === "token") {
                  lastTokenGroupIndex = i;
                  break;
                }
              }

              // Split into collapsible content and final message
              const collapsibleGroups =
                lastTokenGroupIndex >= 0
                  ? chain.groups.slice(0, lastTokenGroupIndex)
                  : chain.groups;
              const finalGroup =
                lastTokenGroupIndex >= 0 ? chain.groups[lastTokenGroupIndex] : null;

              const renderGroup = (group: (typeof chain.groups)[0]) => {
                if (group.type === "tool_group") {
                  return <ToolCallGroup key={group.id} events={group.events} groupId={group.id} />;
                }
                if (group.type === "question") {
                  const event = group.event;
                  const requestId = (event.args?.id as string) || event.callId || group.id;
                  const answered = answeredQuestions.get(requestId);

                  if (answered) {
                    return (
                      <AnsweredQuestion
                        key={group.id}
                        questions={answered.questions}
                        answers={answered.answers}
                      />
                    );
                  }
                  return null;
                }
                return (
                  <EventItem
                    key={group.id}
                    event={group.event}
                    currentParticipantId={currentParticipantId}
                    chainStartTime={chainStartTime}
                    chainEndTime={chainEndTime}
                    chainIsComplete={chain.isComplete}
                  />
                );
              };

              return (
                <MessageChain
                  key={chain.id}
                  events={chain.events}
                  isComplete={chain.isComplete}
                  collapsibleContent={collapsibleGroups.map(renderGroup)}
                  finalContent={finalGroup ? renderGroup(finalGroup) : undefined}
                />
              );
            })}
            {isProcessing && <ThinkingIndicator />}
          </div>
        </div>
      </main>

      {/* Input */}
      <footer className="flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 pb-4">
          {/* Action bar above input */}
          <div className="mb-3">
            <ActionBar.Root
              sessionId={sessionState?.id || ""}
              isArchived={sessionState?.status === "archived"}
              artifacts={artifacts}
            >
              <ActionBar.PreviewLink />
              <ActionBar.PrLink />
            </ActionBar.Root>
          </div>

          {/* Composer - handles both typing and question modes */}
          <Composer.Root
            pendingQuestion={pendingQuestion}
            onSubmitPrompt={handlePromptSubmit}
            onSubmitAnswer={handleQuestionAnswer}
            disabled={!sandboxReady}
            isProcessing={isProcessing}
          >
            <div
              className={cn(
                "relative border border-border",
                pendingQuestion
                  ? "rounded-sm bg-background"
                  : "rounded-lg shadow-sm min-h-36 bg-background"
              )}
            >
              {/* Content area with padding for toolbar */}
              <div className="px-4 pb-3">
                <Composer.ContentSlot />
              </div>

              {/* Floating toolbars (only in typing mode) */}
              <Composer.ToolbarLeft
                modelName={formatModelNameShort(selectedModel)}
                onModelClick={() => !isProcessing && setModelDropdownOpen(!modelDropdownOpen)}
                thinkingEnabled={thinkingEnabled}
                onThinkingToggle={setThinkingEnabled}
                planEnabled={planEnabled}
                onPlanToggle={setPlanEnabled}
              />
              <Composer.ToolbarRight
                onStop={stopExecution}
                onAddClick={() => {
                  /* TODO: Open attachment dialog */
                }}
              />

              {/* Model dropdown menu */}
              {modelDropdownOpen && !pendingQuestion && (
                <div
                  ref={modelDropdownRef}
                  className="absolute bottom-12 left-3 w-56 bg-background shadow-lg border border-border rounded-lg py-1 z-50"
                >
                  {MODEL_OPTIONS.map((group, groupIdx) => (
                    <div key={group.category}>
                      <div
                        className={`px-3 py-1.5 text-xs font-medium text-secondary-foreground uppercase tracking-wider ${
                          groupIdx > 0 ? "border-t border-border-muted mt-1" : ""
                        }`}
                      >
                        {group.category}
                      </div>
                      {group.models.map((model) => (
                        <ModelOptionButton
                          key={model.id}
                          model={model}
                          isSelected={selectedModel === model.id}
                          onSelect={() => {
                            setSelectedModel(model.id);
                            setModelDropdownOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Composer.Root>
        </div>
      </footer>
    </div>
  );
}

function SessionStatus({
  connected,
  connecting,
  sandboxStatus,
}: {
  connected: boolean;
  connecting: boolean;
  sandboxStatus?: string;
}) {
  // Show connection status if not connected
  if (connecting) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-500">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        Connecting...
      </span>
    );
  }

  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-500">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Disconnected
      </span>
    );
  }

  // Connected - show sandbox status
  const statusConfig: Record<
    string,
    { color: string; bgColor: string; label: string; pulse?: boolean }
  > = {
    pending: {
      color: "text-muted-foreground",
      bgColor: "bg-muted-foreground",
      label: "Starting...",
    },
    warming: {
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-500",
      label: "Warming up...",
      pulse: true,
    },
    syncing: { color: "text-accent", bgColor: "bg-accent", label: "Syncing...", pulse: true },
    ready: { color: "text-success", bgColor: "bg-success", label: "Ready" },
    running: { color: "text-accent", bgColor: "bg-accent", label: "Running", pulse: true },
    stopped: { color: "text-muted-foreground", bgColor: "bg-muted-foreground", label: "Stopped" },
    failed: { color: "text-red-600 dark:text-red-500", bgColor: "bg-red-500", label: "Failed" },
  };

  const config = statusConfig[sandboxStatus || "pending"] || statusConfig.pending;

  return (
    <span className={`flex items-center gap-1.5 text-xs ${config.color}`}>
      <span
        className={`w-2 h-2 rounded-full ${config.bgColor} ${config.pulse ? "animate-pulse" : ""}`}
      />
      {config.label}
    </span>
  );
}

function ThinkingIndicator() {
  return (
    <div className="bg-card p-4 flex items-center gap-2">
      <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />
      <span className="text-sm text-muted-foreground">Thinking...</span>
    </div>
  );
}

function EventItem({
  event,
  currentParticipantId,
  chainStartTime,
  chainEndTime,
  chainIsComplete,
}: {
  event: {
    type: string;
    content?: string;
    tool?: string;
    args?: Record<string, unknown>;
    result?: string;
    error?: string;
    status?: string;
    timestamp: number;
    author?: {
      participantId: string;
      name: string;
      avatar?: string;
    };
  };
  currentParticipantId: string | null;
  chainStartTime?: number;
  chainEndTime?: number;
  chainIsComplete?: boolean;
}) {
  const time = new Date(event.timestamp * 1000).toLocaleTimeString();

  switch (event.type) {
    case "user_message": {
      // Display user's prompt with correct author attribution - right aligned
      if (!event.content) return null;

      return (
        <div className="flex justify-end pb-4">
          <div className="relative min-w-0 max-w-full">
            <div className="max-w-xl lg:max-w-3xl p-3 rounded px-4 break-words overflow-hidden bg-highlight text-highlight-foreground">
              <div className="text-sm break-words whitespace-pre-wrap">{event.content}</div>
            </div>
          </div>
        </div>
      );
    }

    case "token": {
      // Display the model's text response with safe markdown rendering
      if (!event.content) return null;

      const handleCopy = () => {
        navigator.clipboard.writeText(event.content || "");
      };

      // Calculate execution time if chain is complete
      const executionTime =
        chainIsComplete && chainStartTime && chainEndTime
          ? chainEndTime - chainStartTime
          : undefined;

      return (
        <div className="flex justify-start relative">
          <div className="flex flex-col w-full max-w-xl lg:max-w-3xl space-y-1 break-words">
            <div className="my-1">
              <SafeMarkdown
                content={event.content}
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

    case "tool_call":
      // Tool calls are handled by ToolCallGroup component
      return null;

    case "tool_result":
      // Tool results are now shown inline with tool calls
      // Only show standalone results if they're errors
      if (!event.error) return null;
      return (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 py-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="truncate">{event.error}</span>
          <span className="text-xs text-secondary-foreground ml-auto">{time}</span>
        </div>
      );

    case "git_sync":
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-accent" />
          Git sync: {event.status}
          <span className="text-xs">{time}</span>
        </div>
      );

    case "execution_complete":
      // Execution complete events are now handled via the message footer
      // They don't need their own visual representation
      return null;

    default:
      return null;
  }
}
