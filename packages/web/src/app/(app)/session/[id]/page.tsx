"use client";

import { ArrowUp, Check, Layers, LogOut, PanelLeft, Square } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "@/components/action-bar";
import type { QuestionInfo } from "@/components/question-card";
import { AnsweredQuestion, QuestionCard } from "@/components/question-card";
import { SafeMarkdown } from "@/components/safe-markdown";
import { SessionRightSidebar } from "@/components/session-right-sidebar";
import { useSidebarContext } from "@/components/sidebar-layout";
import { ToolCallGroup } from "@/components/tool-call-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HeaderSkeleton, MessageListSkeleton } from "@/components/ui/skeleton";
import { SessionContext, useSessionSocket } from "@/hooks/use-session-socket";
import { authClient } from "@/lib/auth-client";
import { formatModelNameLower } from "@/lib/format";
import type { SandboxEvent } from "@/types/session";
import { MessageFooter } from "@/components/message-footer";

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
    currentParticipantId,
    isProcessing,
    sendPrompt,
    sendQuestionAnswer,
    stopExecution,
    sendTyping,
    reconnect,
  } = useSession();

  const { isOpen, toggle } = useSidebarContext();

  // Local UI state
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(
    "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0"
  );
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
          answered.set(requestId, { questions, answers: [[event.output]] });
        }
      }
    }
    return answered;
  }, [events]);

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

  // Check if sandbox is ready to accept messages
  const sandboxReady =
    sessionState?.sandboxStatus === "ready" || sessionState?.sandboxStatus === "running";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing || !sandboxReady) return;
    sendPrompt(prompt, selectedModel);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(), 300);
  };

  // Group events for rendering (deduplication now happens in the hook)
  const groupedEvents = useMemo(() => groupEvents(events), [events]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      {!sessionState ? (
        <HeaderSkeleton />
      ) : (
        <header className="border-b border-border-muted flex-shrink-0">
          <div className="px-4 py-3 flex items-center justify-between">
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
                <h1 className="font-medium text-foreground">
                  {sessionState.title || `${sessionState.repoOwner}/${sessionState.repoName}`}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {sessionState.repoOwner}/{sessionState.repoName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SessionStatus
                connected={connected}
                connecting={connecting}
                sandboxStatus={sessionState.sandboxStatus}
              />
              <ParticipantsList participants={participants} />
              <UserMenu />
            </div>
          </div>
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
      <main className="flex-1 flex overflow-hidden">
        {/* Event timeline */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-2">
            {connecting && events.length === 0 && <MessageListSkeleton />}
            {groupedEvents.map((group) => {
              if (group.type === "tool_group") {
                return <ToolCallGroup key={group.id} events={group.events} groupId={group.id} />;
              }
              if (group.type === "question") {
                const event = group.event;
                const requestId = (event.args?.id as string) || event.callId || group.id;
                const questions = (event.args?.questions as QuestionInfo[]) || [];
                const answered = answeredQuestions.get(requestId);

                // Show answered state if we have it (from events with status=completed)
                if (answered) {
                  return (
                    <AnsweredQuestion
                      key={group.id}
                      questions={answered.questions}
                      answers={answered.answers}
                    />
                  );
                }

                // Show unanswered question card
                return (
                  <QuestionCard
                    key={group.id}
                    requestId={requestId}
                    questions={questions}
                    onAnswer={handleQuestionAnswer}
                  />
                );
              }
              return (
                <EventItem
                  key={group.id}
                  event={group.event}
                  currentParticipantId={currentParticipantId}
                />
              );
            })}
            {isProcessing && <ThinkingIndicator />}
          </div>
        </div>

        {/* Right sidebar */}
        <SessionRightSidebar
          sessionState={sessionState}
          participants={participants}
          events={events}
          artifacts={artifacts}
        />
      </main>

      {/* Input */}
      <footer className="border-t border-border-muted flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
          {/* Action bar above input */}
          <div className="mb-3">
            <ActionBar.Root
              sessionId={sessionState?.id || ""}
              isArchived={sessionState?.status === "archived"}
              artifacts={artifacts}
            >
              <ActionBar.PreviewLink />
              <ActionBar.PrLink />
              <ActionBar.ArchiveToggle onArchive={handleArchive} onUnarchive={handleUnarchive} />
              <ActionBar.Menu />
            </ActionBar.Root>
          </div>

          {/* Input container */}
          <div className="border border-border bg-input">
            {/* Text input area with floating send button */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  !sandboxReady
                    ? "Waiting for sandbox..."
                    : isProcessing
                      ? "Type your next message..."
                      : "Ask or build anything"
                }
                className="w-full resize-none bg-transparent px-4 pt-4 pb-12 focus:outline-none text-foreground placeholder:text-secondary-foreground"
                rows={3}
              />
              {/* Floating action buttons */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {isProcessing && prompt.trim() && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">Waiting...</span>
                )}
                {isProcessing && (
                  <button
                    type="button"
                    onClick={stopExecution}
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title="Stop"
                  >
                    <Square className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!prompt.trim() || isProcessing || !sandboxReady}
                  className="p-2 text-secondary-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title={
                    !sandboxReady
                      ? "Waiting for sandbox to be ready"
                      : isProcessing && prompt.trim()
                        ? "Wait for execution to complete"
                        : "Send"
                  }
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Footer row with model selector and agent label */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border-muted">
              {/* Left side - Model selector */}
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => !isProcessing && setModelDropdownOpen(!modelDropdownOpen)}
                  disabled={isProcessing}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{formatModelNameLower(selectedModel)}</span>
                </button>

                {/* Dropdown menu */}
                {modelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-background shadow-lg border border-border py-1 z-50">
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

              {/* Right side - Agent label */}
              <span className="text-sm text-muted-foreground">build agent</span>
            </div>
          </div>
        </form>
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

function ParticipantsList({
  participants,
}: {
  participants: { userId: string; name: string; status: string; avatar?: string }[];
}) {
  if (participants.length === 0) return null;

  // Deduplicate participants by userId (same user may have multiple connections)
  const uniqueParticipants = Array.from(new Map(participants.map((p) => [p.userId, p])).values());

  return (
    <div className="flex -space-x-2">
      {uniqueParticipants.slice(0, 3).map((p) => (
        <Avatar key={`header-${p.userId}`} className="w-8 h-8 border-2 border-background">
          {p.avatar && <AvatarImage src={p.avatar} alt={p.name} />}
          <AvatarFallback className="text-xs">{p.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {uniqueParticipants.length > 3 && (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground border-2 border-background">
          +{uniqueParticipants.length - 3}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  if (!session?.user) return null;

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0].toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none" title={user.name || user.email || "User menu"}>
          <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition">
            {user.image && <AvatarImage src={user.image} alt={user.name || "Profile"} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {user.name && <p className="text-sm font-medium">{user.name}</p>}
            {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EventItem({
  event,
  currentParticipantId,
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
              <div className="text-sm break-words whitespace-pre-wrap">
                {event.content}
              </div>
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

      return (
        <div className="flex justify-start relative">
          <div className="flex flex-col w-full max-w-xl lg:max-w-3xl space-y-1 break-words">
            <div className="my-1">
              <SafeMarkdown content={event.content} className="prose prose-sm dark:prose-invert antialiased select-text text-pretty" />
            </div>
            <MessageFooter
              onCopy={handleCopy}
              showUndo={false}
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
