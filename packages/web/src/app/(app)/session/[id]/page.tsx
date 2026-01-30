"use client";

import { Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "@/components/action-bar";
import { Composer, type PendingQuestion } from "@/components/composer";
import type { QuestionInfo } from "@/components/question-card";
import { MessageList, SessionHeader, SessionStatus } from "@/components/session";
import { SessionRightSidebar } from "@/components/session-right-sidebar";
import { useRightPanelContext, useSidebarContext } from "@/components/sidebar-layout";
import { HeaderSkeleton } from "@/components/ui/skeleton";
import { SessionContext, useSessionSocket } from "@/hooks/use-session-socket";
import { useSessionsContext } from "@/hooks/use-sessions";
import { authClient } from "@/lib/auth-client";
import { formatModelNameShort } from "@/lib/format";
import { cn } from "@/lib/utils";

// Hook to access session context
function useSession() {
  const context = use(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionContext");
  }
  return context;
}

// Model options configuration
interface ModelOption {
  id: string;
  name: string;
  description: string;
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

  // Sync session data to sidebar
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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Derive answered questions from events
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
          const extractedAnswers: string[][] = [];
          for (const q of questions) {
            const escapedQuestion = q.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(`"${escapedQuestion}"\\s*=\\s*"([^"]*)"`, "i");
            const match = event.output.match(pattern);
            if (match) {
              extractedAnswers.push([match[1]]);
            } else {
              extractedAnswers.push([]);
            }
          }
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

  // Derive pending question for the composer
  const pendingQuestion: PendingQuestion | null = useMemo(() => {
    for (const event of events) {
      if (event.type === "tool_call" && event.tool === "question" && event.status !== "completed") {
        const requestId = (event.args?.id as string) || event.callId || "";
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

  // Handle question answer via WebSocket
  const handleQuestionAnswer = useCallback(
    (requestId: string, answers: string[][]) => {
      sendQuestionAnswer(requestId, answers);
    },
    [sendQuestionAnswer]
  );

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
    return () => setRightPanelContent(null);
  }, [sessionState, participants, events, artifacts, setRightPanelContent]);

  const sandboxReady =
    sessionState?.sandboxStatus === "ready" || sessionState?.sandboxStatus === "running";

  const handlePromptSubmit = useCallback(
    (prompt: string) => {
      if (!prompt.trim() || isProcessing || !sandboxReady) return;
      sendPrompt(prompt, selectedModel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTyping(), 300);
    },
    [isProcessing, sandboxReady, selectedModel, sendPrompt, sendTyping]
  );

  // Count unique participants
  const uniqueParticipantCount = useMemo(
    () => new Set(participants.map((p) => p.userId)).size,
    [participants]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      {!sessionState ? (
        <HeaderSkeleton />
      ) : (
        <SessionHeader
          title={sessionState.title ?? "Untitled Session"}
          repoOwner={sessionState.repoOwner}
          repoName={sessionState.repoName}
          showSidebarToggle={!isOpen}
          onToggleSidebar={toggle}
        >
          <SessionStatus
            connected={connected}
            connecting={connecting}
            sandboxStatus={sessionState.sandboxStatus}
          />
        </SessionHeader>
      )}

      {/* Connection error banner */}
      {(authError || connectionError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{authError || connectionError}</p>
          <button
            type="button"
            onClick={reconnect}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <MessageList
          events={events}
          isProcessing={isProcessing}
          isConnecting={connecting}
          currentParticipantId={currentParticipantId}
          uniqueParticipantCount={uniqueParticipantCount}
          answeredQuestions={answeredQuestions}
        />
      </main>

      {/* Input */}
      <footer className="flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 pb-4">
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
              <div className="px-4 pb-3">
                <Composer.ContentSlot />
              </div>

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
