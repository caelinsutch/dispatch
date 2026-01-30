"use client";

import { ArrowUp, Layers, Paperclip, Square } from "lucide-react";
import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Context Interface (state, actions, meta pattern)
// ============================================================================

interface PromptInputState {
  value: string;
  status: "ready" | "streaming" | "disabled";
}

interface PromptInputActions {
  setValue: (value: string) => void;
  submit: () => void;
}

interface PromptInputMeta {
  disabled: boolean;
  canSubmit: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

interface PromptInputContextValue {
  state: PromptInputState;
  actions: PromptInputActions;
  meta: PromptInputMeta;
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInput() {
  const context = use(PromptInputContext);
  if (!context) {
    throw new Error("usePromptInput must be used within PromptInput.Root");
  }
  return context;
}

// ============================================================================
// Root Component (Provider)
// ============================================================================

interface PromptInputRootProps {
  children: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  status?: "ready" | "streaming" | "disabled";
  disabled?: boolean;
  className?: string;
}

function PromptInputRoot({
  children,
  value,
  onChange,
  onSubmit,
  status = "ready",
  disabled = false,
  className,
}: PromptInputRootProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = disabled || status === "disabled";
  const canSubmit = !isDisabled && value.trim().length > 0;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    },
    [canSubmit, onSubmit]
  );

  const contextValue: PromptInputContextValue = {
    state: {
      value,
      status,
    },
    actions: {
      setValue: onChange,
      submit: onSubmit,
    },
    meta: {
      disabled: isDisabled,
      canSubmit,
      textareaRef,
    },
  };

  return (
    <PromptInputContext value={contextValue}>
      <form onSubmit={handleSubmit} className={cn("w-full", className)}>
        <div
          className="relative border border-border rounded-xl bg-background shadow-sm focus-within:ring-0 focus-within:outline-none cursor-text"
          style={{ outline: "none" }}
        >
          {children}
        </div>
      </form>
    </PromptInputContext>
  );
}

// ============================================================================
// Compound Components
// ============================================================================

// Textarea component (React 19: ref as prop, not forwardRef)
interface PromptInputTextareaProps {
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
  ref?: React.Ref<HTMLTextAreaElement>;
}

function PromptInputTextarea({
  placeholder = "Ask or build anything...",
  className,
  minRows = 3,
  maxRows = 8,
  ref,
}: PromptInputTextareaProps) {
  const { state, actions, meta } = usePromptInput();

  // Auto-resize textarea
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.value is intentionally a dependency to trigger resize when text changes
  useEffect(() => {
    const textarea = meta.textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const lineHeight = 24; // Approximate line height
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }
  }, [state.value, minRows, maxRows, meta.textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      actions.submit();
    }
  };

  return (
    <textarea
      ref={(node) => {
        (meta.textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      }}
      value={state.value}
      onChange={(e) => actions.setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={meta.disabled}
      className={cn(
        "w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ outline: "none", boxShadow: "none" }}
      rows={minRows}
    />
  );
}

// Footer component for tools and submit
interface PromptInputFooterProps {
  children: React.ReactNode;
  className?: string;
}

function PromptInputFooter({ children, className }: PromptInputFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 border-t border-border/50",
        className
      )}
    >
      {children}
    </div>
  );
}

// Tools container (left side of footer)
interface PromptInputToolsProps {
  children: React.ReactNode;
  className?: string;
}

function PromptInputTools({ children, className }: PromptInputToolsProps) {
  return <div className={cn("flex items-center gap-1", className)}>{children}</div>;
}

// Actions container (right side of footer)
interface PromptInputActionsProps {
  children: React.ReactNode;
  className?: string;
}

function PromptInputActions({ children, className }: PromptInputActionsProps) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}

// Submit button
interface PromptInputSubmitProps {
  className?: string;
}

function PromptInputSubmit({ className }: PromptInputSubmitProps) {
  const { meta } = usePromptInput();

  return (
    <button
      type="submit"
      disabled={!meta.canSubmit}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-lg transition-colors",
        meta.canSubmit
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "bg-muted text-muted-foreground cursor-not-allowed",
        className
      )}
      title="Send message"
    >
      <ArrowUp className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

// Stop button (shown during streaming)
interface PromptInputStopProps {
  onStop: () => void;
  className?: string;
}

function PromptInputStop({ onStop, className }: PromptInputStopProps) {
  const { state } = usePromptInput();

  if (state.status !== "streaming") return null;

  return (
    <button
      type="button"
      onClick={onStop}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors",
        className
      )}
      title="Stop generation"
    >
      <Square className="h-4 w-4" />
    </button>
  );
}

// Model selector button
interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

interface PromptInputModelSelectorProps {
  models: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function PromptInputModelSelector({
  models,
  value,
  onChange,
  disabled = false,
  className,
}: PromptInputModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedModel = models.find((m) => m.id === value);
  const displayName = selectedModel?.name || "Select model";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="h-7 px-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <Layers className="h-3.5 w-3.5" />
        <span>{displayName}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-popover shadow-lg border border-border rounded-lg py-1 z-50">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex flex-col items-start px-3 py-2 text-sm hover:bg-muted transition",
                value === model.id ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="font-medium">{model.name}</span>
              {model.description && (
                <span className="text-xs text-muted-foreground">{model.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Attachment button
interface PromptInputAttachmentButtonProps {
  onClick?: () => void;
  className?: string;
}

function PromptInputAttachmentButton({ onClick, className }: PromptInputAttachmentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition",
        className
      )}
      title="Add attachment"
    >
      <Paperclip className="h-3.5 w-3.5" />
    </button>
  );
}

// Export compound component
export const PromptInput = {
  Root: PromptInputRoot,
  Textarea: PromptInputTextarea,
  Footer: PromptInputFooter,
  Tools: PromptInputTools,
  Actions: PromptInputActions,
  Submit: PromptInputSubmit,
  Stop: PromptInputStop,
  ModelSelector: PromptInputModelSelector,
  AttachmentButton: PromptInputAttachmentButton,
};

// Also export individual components and hooks for flexibility
export {
  PromptInputRoot,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActions,
  PromptInputSubmit,
  PromptInputStop,
  PromptInputModelSelector,
  PromptInputAttachmentButton,
  usePromptInput,
};
