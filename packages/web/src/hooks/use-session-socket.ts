"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Artifact, FileChange, SandboxEvent } from "@/types/session";

// WebSocket URL (should come from env in production)
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8787";

// WebSocket close codes
const WS_CLOSE_AUTH_REQUIRED = 4001;
const WS_CLOSE_SESSION_EXPIRED = 4002;

export interface SessionState {
  id: string;
  title: string | null;
  repoOwner: string;
  repoName: string;
  branchName: string | null;
  status: string;
  sandboxStatus: string;
  messageCount: number;
  createdAt: number;
  model?: string;
  isProcessing: boolean;
  tunnelUrls?: Record<number, string>;
  activePorts?: number[];
}

export interface Participant {
  participantId: string;
  userId: string;
  name: string;
  avatar?: string;
  status: "active" | "idle" | "away";
  lastSeen: number;
}

export interface UseSessionSocketReturn {
  connected: boolean;
  connecting: boolean;
  authError: string | null;
  connectionError: string | null;
  sessionState: SessionState | null;
  events: SandboxEvent[];
  participants: Participant[];
  artifacts: Artifact[];
  filesChanged: FileChange[];
  currentParticipantId: string | null;
  isProcessing: boolean;
  sendPrompt: (content: string, model?: string) => void;
  sendQuestionAnswer: (requestId: string, answers: string[][]) => void;
  stopExecution: () => void;
  sendTyping: () => void;
  reconnect: () => void;
}

// Context for sharing session state without prop drilling
export const SessionContext = createContext<UseSessionSocketReturn | null>(null);

export function useSessionSocket(sessionId: string): UseSessionSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);
  const mountedRef = useRef(true);
  const subscribedRef = useRef(false);
  const wsTokenRef = useRef<string | null>(null);
  // Accumulates text during streaming, displayed only on completion to avoid duplicate display.
  // Stores only the latest token since token events contain the full accumulated text (not incremental).
  const pendingTextRef = useRef<{ content: string; messageId: string; timestamp: number } | null>(
    null
  );
  // Track seen tool call IDs for deduplication
  const seenToolCallsRef = useRef<Map<string, number>>(new Map());
  const seenCompletionsRef = useRef<Set<string>>(new Set());

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [events, setEvents] = useState<SandboxEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const currentParticipantRef = useRef<{
    participantId: string;
    name: string;
    avatar?: string;
  } | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const hasWarmedRef = useRef(false);

  // Helper to flush pending text
  const flushPendingText = useCallback(() => {
    if (pendingTextRef.current) {
      const pending = pendingTextRef.current;
      pendingTextRef.current = null;
      setEvents((prev) => [
        ...prev,
        {
          type: "token",
          content: pending.content,
          messageId: pending.messageId,
          timestamp: pending.timestamp,
        },
      ]);
    }
  }, []);

  const handleMessage = useCallback(
    (data: {
      type: string;
      state?: SessionState;
      event?: SandboxEvent;
      participants?: Participant[];
      artifact?: Artifact;
      userId?: string;
      messageId?: string;
      position?: number;
      status?: string;
      error?: string;
      participantId?: string;
      participant?: { participantId: string; name: string; avatar?: string };
      isProcessing?: boolean;
      activePorts?: number[];
    }) => {
      switch (data.type) {
        case "subscribed":
          console.log("WebSocket subscribed to session");
          subscribedRef.current = true;
          // Clear existing state since we're about to receive fresh history
          setEvents([]);
          setArtifacts([]);
          pendingTextRef.current = null;
          seenToolCallsRef.current.clear();
          seenCompletionsRef.current.clear();
          if (data.state) {
            setSessionState(data.state);
          }
          // Store the current user's participant ID and info for author attribution
          if (data.participantId) {
            setCurrentParticipantId(data.participantId);
          }
          // Initialize participant ref immediately for sendPrompt author attribution
          if (data.participant) {
            currentParticipantRef.current = data.participant;
          }
          // Trigger sandbox warming automatically on first subscription
          if (!hasWarmedRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            hasWarmedRef.current = true;
            wsRef.current.send(JSON.stringify({ type: "typing" }));
          }
          break;

        case "prompt_queued":
          // Could show queue position indicator
          break;

        case "sandbox_event":
          if (data.event) {
            const event = data.event;

            if (event.type === "token" && event.content && event.messageId) {
              // Accumulate text but DON'T display yet
              pendingTextRef.current = {
                content: event.content,
                messageId: event.messageId,
                timestamp: event.timestamp,
              };
            } else if (event.type === "execution_complete") {
              // On completion: Add final text to events
              flushPendingText();
              // Skip duplicate execution_complete for the same message
              if (event.messageId && seenCompletionsRef.current.has(event.messageId)) {
                break;
              }
              if (event.messageId) {
                seenCompletionsRef.current.add(event.messageId);
              }
              setEvents((prev) => [...prev, event]);
            } else if (event.type === "tool_call" && event.callId) {
              // DEBUG: Log Task tool events to trace metadata
              if (event.tool?.toLowerCase() === "task") {
                console.log("[useSessionSocket] TASK TOOL EVENT:", {
                  tool: event.tool,
                  status: event.status,
                  callId: event.callId,
                  hasMetadata: !!event.metadata,
                  metadata: event.metadata,
                  args: event.args,
                });
              }
              // Deduplicate tool_call events by callId - merge with existing to preserve args
              setEvents((prev) => {
                const existingIdx = seenToolCallsRef.current.get(event.callId!);
                if (existingIdx !== undefined && prev[existingIdx]) {
                  // Merge new event with existing, preserving original args (like questions)
                  // while updating status and output from the new event
                  const existing = prev[existingIdx];
                  const updated = [...prev];
                  const merged = {
                    ...existing,
                    ...event,
                    // Merge args to preserve original data like questions
                    args: { ...(existing.args || {}), ...(event.args || {}) },
                    // Preserve metadata from new event (if present)
                    metadata: event.metadata || existing.metadata,
                  };
                  // DEBUG: Log merge for Task tools
                  if (event.tool?.toLowerCase() === "task") {
                    console.log("[useSessionSocket] TASK MERGE:", {
                      existingMetadata: existing.metadata,
                      newMetadata: event.metadata,
                      finalMetadata: merged.metadata,
                    });
                  }
                  updated[existingIdx] = merged;
                  return updated;
                }
                // Track new tool call (or update stale index)
                seenToolCallsRef.current.set(event.callId!, prev.length);
                return [...prev, event];
              });
            } else {
              // Other events (user_message, git_sync, etc.) - add normally
              setEvents((prev) => [...prev, event]);
            }
          }
          break;

        case "presence_sync":
        case "presence_update":
          if (data.participants) {
            setParticipants(data.participants);
            // Update current participant info for author attribution
            setCurrentParticipantId((currentId) => {
              if (currentId) {
                const currentParticipant = data.participants!.find(
                  (p) => p.participantId === currentId
                );
                if (currentParticipant) {
                  currentParticipantRef.current = {
                    participantId: currentParticipant.participantId,
                    name: currentParticipant.name,
                    avatar: currentParticipant.avatar,
                  };
                }
              }
              return currentId;
            });
          }
          break;

        case "presence_leave":
          if (data.userId) {
            setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
          }
          break;

        case "sandbox_warming":
          setSessionState((prev) => (prev ? { ...prev, sandboxStatus: "warming" } : null));
          break;

        case "sandbox_spawning":
          setSessionState((prev) => (prev ? { ...prev, sandboxStatus: "spawning" } : null));
          break;

        case "sandbox_status":
          if (data.status) {
            const status = data.status;
            setSessionState((prev) => (prev ? { ...prev, sandboxStatus: status } : null));
          }
          break;

        case "sandbox_ready":
          setSessionState((prev) => (prev ? { ...prev, sandboxStatus: "ready" } : null));
          break;

        case "artifact_created":
          if (data.artifact) {
            setArtifacts((prev) => {
              // Avoid duplicates
              const existing = prev.find((a) => a.id === data.artifact!.id);
              if (existing) {
                return prev.map((a) => (a.id === data.artifact!.id ? data.artifact! : a));
              }
              return [...prev, data.artifact!];
            });
          }
          break;

        case "artifact_updated":
          if (data.artifact) {
            setArtifacts((prev) =>
              prev.map((a) => (a.id === data.artifact!.id ? data.artifact! : a))
            );
          }
          break;

        case "session_status":
          if (data.status) {
            setSessionState((prev) => (prev ? { ...prev, status: data.status! } : null));
          }
          break;

        case "processing_status":
          if (typeof data.isProcessing === "boolean") {
            const isProcessing = data.isProcessing;
            setSessionState((prev) => (prev ? { ...prev, isProcessing } : null));
          }
          break;

        case "active_ports_updated":
          if (data.activePorts) {
            setSessionState((prev) => (prev ? { ...prev, activePorts: data.activePorts } : null));
          }
          break;

        case "sandbox_error":
          console.error("Sandbox error:", data.error);
          setSessionState((prev) => (prev ? { ...prev, sandboxStatus: "failed" } : null));
          break;

        case "pong":
          // Health check response
          break;

        case "error":
          console.error("Session error:", data);
          break;

        case "history_complete":
          // Historical events have been sent - flush any accumulated text
          flushPendingText();
          break;

        case "question_answer_queued":
          console.log("Question answer queued:", data);
          // The answer is queued, sandbox is starting - no action needed
          break;

        case "question_answer_error":
          console.error("Question answer error:", data);
          // TODO: Could emit an event or update state to show error in UI
          break;
      }
    },
    [flushPendingText]
  );

  const fetchWsToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/ws-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthError("Please sign in to connect");
          return null;
        }
        const error = await response.text();
        console.error("Failed to fetch WS token:", error);
        setAuthError("Failed to authenticate");
        return null;
      }

      const data = (await response.json()) as { token: string };
      return data.token;
    } catch (error) {
      console.error("Failed to fetch WS token:", error);
      setAuthError("Failed to authenticate");
      return null;
    }
  }, [sessionId]);

  const connect = useCallback(async () => {
    // Use ref to avoid race conditions with React StrictMode
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already open");
      return;
    }
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log("WebSocket already connecting");
      return;
    }
    if (connectingRef.current) {
      console.log("Connection in progress (ref)");
      return;
    }

    connectingRef.current = true;
    setConnecting(true);
    setAuthError(null);

    // Fetch a WebSocket auth token first
    if (!wsTokenRef.current) {
      const token = await fetchWsToken();
      if (!token) {
        connectingRef.current = false;
        setConnecting(false);
        return;
      }
      wsTokenRef.current = token;
    }

    const wsUrl = `${WS_URL}/sessions/${sessionId}/ws`;
    console.log("WebSocket connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      console.log("WebSocket connected!");
      connectingRef.current = false;
      setConnected(true);
      setConnecting(false);
      reconnectAttempts.current = 0;

      // Subscribe to session with the auth token
      ws.send(
        JSON.stringify({
          type: "subscribe",
          token: wsTokenRef.current,
          clientId: crypto.randomUUID(),
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      connectingRef.current = false;
      subscribedRef.current = false;
      setConnected(false);
      setConnecting(false);
      wsRef.current = null;

      // Flush any pending text to prevent data loss
      flushPendingText();

      // Handle authentication errors
      if (event.code === WS_CLOSE_AUTH_REQUIRED) {
        setAuthError("Authentication failed. Please sign in again.");
        // Clear the token so we fetch a new one on reconnect
        wsTokenRef.current = null;
        return;
      }

      // Handle session expired (e.g., after server hibernation)
      if (event.code === WS_CLOSE_SESSION_EXPIRED) {
        setConnectionError("Session expired. Please reconnect.");
        wsTokenRef.current = null;
        return;
      }

      // Only reconnect if mounted and not a clean close
      if (mountedRef.current && !event.wasClean) {
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          reconnectAttempts.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          // Exhausted reconnection attempts
          console.error("WebSocket reconnection failed after 5 attempts");
          setConnectionError("Connection lost. Please check your network and try reconnecting.");
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error event:", error);
    };
  }, [sessionId, handleMessage, fetchWsToken, flushPendingText]);

  const sendPrompt = useCallback((content: string, model?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

    if (!subscribedRef.current) {
      console.error("Not subscribed yet, waiting...");
      // Retry after a short delay
      setTimeout(() => sendPrompt(content, model), 500);
      return;
    }

    console.log("Sending prompt:", content, "with model:", model);

    // Add user message to events for display with author info
    const userMessageEvent: SandboxEvent = {
      type: "user_message",
      content,
      timestamp: Date.now() / 1000, // Convert to seconds to match server timestamps
      author: currentParticipantRef.current || undefined,
    };
    setEvents((prev) => [...prev, userMessageEvent]);

    // Optimistically set isProcessing for immediate feedback
    // Server will confirm with processing_status message
    setSessionState((prev) => (prev ? { ...prev, isProcessing: true } : null));

    wsRef.current.send(
      JSON.stringify({
        type: "prompt",
        content,
        model, // Include model for per-message model switching
      })
    );
  }, []);

  const stopExecution = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    // Preserve partial content when stopping
    flushPendingText();
    wsRef.current.send(JSON.stringify({ type: "stop" }));
  }, [flushPendingText]);

  const sendQuestionAnswer = useCallback((requestId: string, answers: string[][]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected, cannot send question answer");
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "question_answer",
        requestId,
        answers,
      })
    );
  }, []);

  const sendTyping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ type: "typing" }));
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    connectingRef.current = false;
    reconnectAttempts.current = 0;
    wsTokenRef.current = null; // Clear token to fetch fresh one
    setAuthError(null);
    setConnectionError(null);
    connect();
  }, [connect]);

  // Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      connectingRef.current = false;
    };
  }, [connect]);

  // Ping every 30 seconds to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  const isProcessing = sessionState?.isProcessing ?? false;

  // Compute files changed from Edit/Write tool calls
  const filesChanged = useMemo(() => {
    const fileMap = new Map<string, FileChange>();

    for (const event of events) {
      if (event.type === "tool_call" && event.status === "completed") {
        const tool = event.tool;
        const args = event.args;

        if ((tool === "Edit" || tool === "Write") && args?.file_path) {
          const filePath = String(args.file_path);
          const existing = fileMap.get(filePath);

          // Estimate additions/deletions from the content
          let additions = 0;
          let deletions = 0;

          if (tool === "Edit" && args.old_string && args.new_string) {
            const oldLines = String(args.old_string).split("\n").length;
            const newLines = String(args.new_string).split("\n").length;
            additions = Math.max(0, newLines - oldLines) || 1;
            deletions = Math.max(0, oldLines - newLines) || 0;
          } else if (tool === "Write" && args.content) {
            additions = String(args.content).split("\n").length;
          }

          if (existing) {
            existing.additions += additions;
            existing.deletions += deletions;
          } else {
            fileMap.set(filePath, {
              filename: filePath,
              additions,
              deletions,
            });
          }
        }
      }
    }

    return Array.from(fileMap.values());
  }, [events]);

  return {
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
  };
}
