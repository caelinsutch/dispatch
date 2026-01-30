"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import type { SessionItem } from "@/components/session-sidebar";

interface SessionsContextValue {
  sessions: SessionItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSession: (id: string, updates: Partial<SessionItem>) => void;
  archiveSession: (id: string) => Promise<boolean>;
  unarchiveSession: (id: string) => Promise<boolean>;
  deleteSession: (id: string) => Promise<boolean>;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function useSessionsContext() {
  const context = use(SessionsContext);
  if (!context) {
    throw new Error("useSessionsContext must be used within a SessionsProvider");
  }
  return context;
}

interface SessionsProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function SessionsProvider({ children, isAuthenticated }: SessionsProviderProps) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = (await res.json()) as { sessions?: SessionItem[] };
        setSessions(data.sessions || []);
      } else {
        setError("Failed to fetch sessions");
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setError("Failed to fetch sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only fetch once when authenticated
  useEffect(() => {
    if (isAuthenticated && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchSessions();
    }
  }, [isAuthenticated, fetchSessions]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchSessions();
  }, [fetchSessions]);

  const updateSession = useCallback((id: string, updates: Partial<SessionItem>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const archiveSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sessions/${id}/archive`, { method: "POST" });
      if (res.ok) {
        // Update local state
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "archived" } : s)));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to archive session:", err);
      return false;
    }
  }, []);

  const unarchiveSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sessions/${id}/unarchive`, { method: "POST" });
      if (res.ok) {
        // Update local state
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "active" } : s)));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to unarchive session:", err);
      return false;
    }
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sessions/${id}/delete`, { method: "DELETE" });
      if (res.ok) {
        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete session:", err);
      return false;
    }
  }, []);

  return (
    <SessionsContext
      value={{
        sessions,
        isLoading,
        error,
        refresh,
        updateSession,
        archiveSession,
        unarchiveSession,
        deleteSession,
      }}
    >
      {children}
    </SessionsContext>
  );
}
