"use client";

import { ArrowDown } from "lucide-react";
import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Context Interface (state, actions, meta pattern)
// ============================================================================

interface ConversationState {
  isAtBottom: boolean;
}

interface ConversationActions {
  scrollToBottom: () => void;
}

interface ConversationMeta {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

interface ConversationContextValue {
  state: ConversationState;
  actions: ConversationActions;
  meta: ConversationMeta;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

function useConversation() {
  const context = use(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used within Conversation.Root");
  }
  return context;
}

// ============================================================================
// Root Component (Provider)
// ============================================================================

interface ConversationRootProps {
  children: React.ReactNode;
  className?: string;
}

function ConversationRoot({ children, className }: ConversationRootProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkIfAtBottom = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      const threshold = 100; // pixels from bottom to consider "at bottom"
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setIsAtBottom(atBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Check on scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", checkIfAtBottom);
      return () => container.removeEventListener("scroll", checkIfAtBottom);
    }
  }, [checkIfAtBottom]);

  const contextValue: ConversationContextValue = {
    state: {
      isAtBottom,
    },
    actions: {
      scrollToBottom,
    },
    meta: {
      scrollRef,
    },
  };

  return (
    <ConversationContext value={contextValue}>
      <div className={cn("relative flex flex-col h-full", className)}>{children}</div>
    </ConversationContext>
  );
}

// ============================================================================
// Compound Components
// ============================================================================

// Content container with scroll (React 19: ref as prop, not forwardRef)
interface ConversationContentProps {
  children: React.ReactNode;
  className?: string;
  autoScroll?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

function ConversationContent({
  children,
  className,
  autoScroll = true,
  ref,
}: ConversationContentProps) {
  const { state, actions, meta } = useConversation();

  // Auto-scroll when new content is added (if at bottom)
  // biome-ignore lint/correctness/useExhaustiveDependencies: children is intentionally a dependency to trigger auto-scroll when messages change
  useEffect(() => {
    if (autoScroll && state.isAtBottom) {
      actions.scrollToBottom();
    }
  }, [children, autoScroll, state.isAtBottom, actions]);

  return (
    <div
      ref={(node) => {
        (meta.scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      className={cn("flex-1 overflow-y-auto", className)}
    >
      {children}
    </div>
  );
}

// Messages container
interface ConversationMessagesProps {
  children: React.ReactNode;
  className?: string;
}

function ConversationMessages({ children, className }: ConversationMessagesProps) {
  return <div className={cn("max-w-3xl mx-auto px-4 py-4 space-y-4", className)}>{children}</div>;
}

// Scroll to bottom button
interface ConversationScrollButtonProps {
  className?: string;
}

function ConversationScrollButton({ className }: ConversationScrollButtonProps) {
  const { state, actions } = useConversation();

  if (state.isAtBottom) return null;

  return (
    <button
      type="button"
      onClick={actions.scrollToBottom}
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 h-8 px-3 flex items-center gap-1.5 bg-background border border-border rounded-full shadow-md hover:bg-muted transition text-sm text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <ArrowDown className="h-3.5 w-3.5" />
      <span>Scroll to bottom</span>
    </button>
  );
}

// Export compound component
export const Conversation = {
  Root: ConversationRoot,
  Content: ConversationContent,
  Messages: ConversationMessages,
  ScrollButton: ConversationScrollButton,
};

// Also export individual components
export {
  ConversationRoot,
  ConversationContent,
  ConversationMessages,
  ConversationScrollButton,
  useConversation,
};
