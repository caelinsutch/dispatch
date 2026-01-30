"use client";

import { ArrowUp, Brain, ChevronLeft, ChevronRight, Map as MapIcon, Plus, X } from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { QuestionInfo } from "@/components/question-card";
import { Toggle } from "@/components/ui/toggle";

// Claude icon SVG path
const ClaudeIcon = ({ className }: { className?: string }) => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    role="img"
    viewBox="0 0 24 24"
    className={className}
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface PendingQuestion {
  requestId: string;
  questions: QuestionInfo[];
}

type ComposerMode = "typing" | "question";

interface ComposerState {
  mode: ComposerMode;
  // Typing state
  prompt: string;
  // Question state
  pendingQuestion: PendingQuestion | null;
  currentQuestionIndex: number;
  selections: Map<number, Set<string>>;
  customInputs: Map<number, string>;
  isSubmitting: boolean;
}

interface ComposerActions {
  // Typing actions
  setPrompt: (value: string) => void;
  submitPrompt: () => void;
  // Question actions
  selectOption: (questionIndex: number, optionIndex: number) => void;
  setCustomInput: (questionIndex: number, value: string) => void;
  submitAnswer: () => void;
  dismissQuestion: () => void;
  navigateQuestion: (direction: "prev" | "next" | number) => void;
}

interface ComposerMeta {
  canSubmitPrompt: boolean;
  canSubmitAnswer: boolean;
  questionCount: number;
  disabled: boolean;
  isProcessing: boolean;
}

interface ComposerContextValue {
  state: ComposerState;
  actions: ComposerActions;
  meta: ComposerMeta;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

function useComposer() {
  const context = use(ComposerContext);
  if (!context) {
    throw new Error("useComposer must be used within Composer.Root");
  }
  return context;
}

// ============================================================================
// Root Component (Provider)
// ============================================================================

interface ComposerRootProps {
  children: React.ReactNode;
  pendingQuestion?: PendingQuestion | null;
  onSubmitPrompt: (prompt: string) => void;
  onSubmitAnswer: (requestId: string, answers: string[][]) => void;
  onDismissQuestion?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  className?: string;
}

function ComposerRoot({
  children,
  pendingQuestion = null,
  onSubmitPrompt,
  onSubmitAnswer,
  onDismissQuestion,
  disabled = false,
  isProcessing = false,
  className,
}: ComposerRootProps) {
  const [prompt, setPrompt] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selections, setSelections] = useState<Map<number, Set<string>>>(new Map());
  const [customInputs, setCustomInputs] = useState<Map<number, string>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset question state when pending question changes
  useEffect(() => {
    if (pendingQuestion) {
      setCurrentQuestionIndex(0);
      setSelections(new Map());
      setCustomInputs(new Map());
      setIsSubmitting(false);
    }
  }, [pendingQuestion?.requestId]);

  const mode: ComposerMode = pendingQuestion ? "question" : "typing";
  const questionCount = pendingQuestion?.questions.length || 0;

  // Typing actions
  const handleSubmitPrompt = useCallback(() => {
    if (!prompt.trim() || disabled || isProcessing) return;
    onSubmitPrompt(prompt);
    setPrompt("");
  }, [prompt, disabled, isProcessing, onSubmitPrompt]);

  // Question actions
  const selectOption = useCallback((questionIndex: number, optionIndex: number) => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      const current = new Set<string>();
      if (pendingQuestion?.questions[questionIndex]) {
        const opt = pendingQuestion.questions[questionIndex].options[optionIndex];
        if (opt) {
          current.add(opt.label);
        }
      }
      newSelections.set(questionIndex, current);
      return newSelections;
    });
    // Clear custom input when selecting an option
    setCustomInputs((prev) => {
      const newInputs = new Map(prev);
      newInputs.delete(questionIndex);
      return newInputs;
    });
  }, [pendingQuestion]);

  const setCustomInputValue = useCallback((questionIndex: number, value: string) => {
    setCustomInputs((prev) => new Map(prev).set(questionIndex, value));
    // Clear selection when typing custom
    setSelections((prev) => {
      const newSelections = new Map(prev);
      newSelections.delete(questionIndex);
      return newSelections;
    });
  }, []);

  const handleSubmitAnswer = useCallback(async () => {
    if (!pendingQuestion || isSubmitting) return;
    setIsSubmitting(true);

    const answers: string[][] = pendingQuestion.questions.map((_, idx) => {
      const selected = selections.get(idx);
      const custom = customInputs.get(idx);
      if (custom?.trim()) {
        return [custom.trim()];
      }
      return selected ? Array.from(selected) : [];
    });

    await onSubmitAnswer(pendingQuestion.requestId, answers);
  }, [pendingQuestion, selections, customInputs, isSubmitting, onSubmitAnswer]);

  const handleDismissQuestion = useCallback(() => {
    onDismissQuestion?.();
  }, [onDismissQuestion]);

  const navigateQuestion = useCallback(
    (direction: "prev" | "next" | number) => {
      setCurrentQuestionIndex((prev) => {
        if (typeof direction === "number") {
          return Math.max(0, Math.min(questionCount - 1, direction));
        }
        if (direction === "prev") {
          return Math.max(0, prev - 1);
        }
        return Math.min(questionCount - 1, prev + 1);
      });
    },
    [questionCount]
  );

  // Derived state
  const canSubmitPrompt = !disabled && !isProcessing && prompt.trim().length > 0;

  const canSubmitAnswer = useMemo(() => {
    if (!pendingQuestion) return false;
    // Check if all questions have an answer
    return pendingQuestion.questions.every((_, idx) => {
      const selected = selections.get(idx);
      const custom = customInputs.get(idx);
      return (selected && selected.size > 0) || custom?.trim();
    });
  }, [pendingQuestion, selections, customInputs]);

  const contextValue: ComposerContextValue = {
    state: {
      mode,
      prompt,
      pendingQuestion,
      currentQuestionIndex,
      selections,
      customInputs,
      isSubmitting,
    },
    actions: {
      setPrompt,
      submitPrompt: handleSubmitPrompt,
      selectOption,
      setCustomInput: setCustomInputValue,
      submitAnswer: handleSubmitAnswer,
      dismissQuestion: handleDismissQuestion,
      navigateQuestion,
    },
    meta: {
      canSubmitPrompt,
      canSubmitAnswer,
      questionCount,
      disabled,
      isProcessing,
    },
  };

  return (
    <ComposerContext value={contextValue}>
      <div className={cn("w-full", className)}>{children}</div>
    </ComposerContext>
  );
}

// ============================================================================
// Typing Mode Components
// ============================================================================

interface TextareaProps {
  placeholder?: string;
  className?: string;
  minRows?: number;
}

function Textarea({
  placeholder = "Ask to make changes, @mention files, run /commands",
  className,
  minRows = 3,
}: TextareaProps) {
  const { state, actions, meta } = useComposer();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Don't render in question mode
  if (state.mode === "question") return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      actions.submitPrompt();
    }
  };

  return (
    <div className="min-h-[80px] max-h-[200px] overflow-y-auto mb-10">
      <textarea
        ref={textareaRef}
        value={state.prompt}
        onChange={(e) => actions.setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          !meta.disabled && meta.isProcessing
            ? "Type your next message..."
            : meta.disabled
              ? "Waiting for sandbox..."
              : placeholder
        }
        disabled={meta.disabled}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={cn(
          "w-full resize-none bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground",
          className
        )}
        style={{ outline: "none", boxShadow: "none" }}
        rows={minRows}
      />
    </div>
  );
}

// ============================================================================
// Question Mode Components
// ============================================================================

function QuestionContent({ className }: { className?: string }) {
  const { state, actions, meta } = useComposer();

  // Don't render in typing mode
  if (state.mode !== "question" || !state.pendingQuestion) return null;

  const currentQuestion = state.pendingQuestion.questions[state.currentQuestionIndex];
  if (!currentQuestion) return null;

  const handleOptionKeyDown = (e: React.KeyboardEvent, optionIndex: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      actions.selectOption(state.currentQuestionIndex, optionIndex);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && meta.canSubmitAnswer) {
      e.preventDefault();
      actions.submitAnswer();
    }
  };

  const selectedSet = state.selections.get(state.currentQuestionIndex);
  const customValue = state.customInputs.get(state.currentQuestionIndex) || "";

  return (
    <div className={cn("px-3 py-3", className)}>
      {/* Question text with dismiss button */}
      <div className="flex items-start gap-2">
        <div className="prose prose-sm prose-invert antialiased select-text text-pretty prose-headings:text-balance text-sm flex-1">
          <p>{currentQuestion.question}</p>
        </div>
        <button
          type="button"
          onClick={actions.dismissQuestion}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Options list */}
      <div className="mt-3 flex flex-col gap-0.5" role="listbox">
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedSet?.has(opt.label) || false;
          return (
            <div
              key={opt.label}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => actions.selectOption(state.currentQuestionIndex, idx)}
              onKeyDown={(e) => handleOptionKeyDown(e, idx)}
              className={cn(
                "flex items-start gap-2 px-2 py-1.5 rounded-sm cursor-pointer transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                isSelected ? "bg-muted" : "hover:bg-muted"
              )}
            >
              <span
                className="w-4 text-xs text-muted-foreground shrink-0 mt-0.5"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {idx + 1}
              </span>
              <span className="text-sm">{opt.label}</span>
            </div>
          );
        })}

        {/* Custom "Other" option */}
        {currentQuestion.custom !== false && (
          <div className="flex items-start gap-2 px-2 py-1.5 rounded-sm transition-colors">
            <span
              className="w-4 text-xs text-muted-foreground shrink-0 mt-0.5"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              0
            </span>
            <textarea
              id={`ask-user-other-${state.pendingQuestion?.requestId}`}
              placeholder="Type something..."
              rows={1}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={customValue}
              onChange={(e) => actions.setCustomInput(state.currentQuestionIndex, e.target.value)}
              onKeyDown={handleCustomKeyDown}
              className="flex-1 text-sm bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              style={{ minHeight: "1.25rem" }}
            />
          </div>
        )}
      </div>

      {/* Footer with pagination and submit */}
      <div className="flex items-center justify-between mt-3">
        {/* Pagination (only show if multiple questions) */}
        {meta.questionCount > 1 ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={state.currentQuestionIndex === 0}
              onClick={() => actions.navigateQuestion("prev")}
              className={cn(
                "text-muted-foreground transition-colors",
                state.currentQuestionIndex === 0
                  ? "opacity-30 cursor-not-allowed hover:text-muted-foreground"
                  : "hover:text-foreground"
              )}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            {state.pendingQuestion?.questions.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => actions.navigateQuestion(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors cursor-pointer hover:opacity-70 border !border-muted-foreground bg-transparent",
                  idx === state.currentQuestionIndex && "ring-1 ring-ring ring-offset-1 ring-offset-background"
                )}
              />
            ))}
            <button
              type="button"
              disabled={state.currentQuestionIndex === meta.questionCount - 1}
              onClick={() => actions.navigateQuestion("next")}
              className={cn(
                "text-muted-foreground transition-colors",
                state.currentQuestionIndex === meta.questionCount - 1
                  ? "opacity-30 cursor-not-allowed hover:text-muted-foreground"
                  : "hover:text-foreground"
              )}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={actions.submitAnswer}
          disabled={!meta.canSubmitAnswer || state.isSubmitting}
          className={cn(
            "inline-flex px-2 items-center gap-2 whitespace-nowrap ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-none",
            "disabled:pointer-events-none disabled:opacity-50",
            "[&_svg]:pointer-events-none text-foreground/90 hover:bg-sidebar-accent hover:text-accent-foreground",
            "font-450 h-6 w-6 [&_svg]:shrink-0 text-xs justify-center rounded-sm",
            meta.canSubmitAnswer && !state.isSubmitting
              ? "bg-foreground cursor-pointer"
              : "bg-foreground/50 cursor-not-allowed"
          )}
        >
          <ArrowUp className="size-4 text-background" style={{ strokeWidth: 1.5 }} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

interface FooterProps {
  children: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: FooterProps) {
  return (
    <div
      className={cn("flex items-center justify-between px-4 py-2 border-t border-border-muted", className)}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Toolbar Components (Typing Mode)
// ============================================================================

interface ToolbarLeftProps {
  modelName?: string;
  onModelClick?: () => void;
  thinkingEnabled?: boolean;
  onThinkingToggle?: (pressed: boolean) => void;
  planEnabled?: boolean;
  onPlanToggle?: (pressed: boolean) => void;
  className?: string;
}

function ToolbarLeft({
  modelName = "Opus 4.5",
  onModelClick,
  thinkingEnabled = false,
  onThinkingToggle,
  planEnabled = false,
  onPlanToggle,
  className,
}: ToolbarLeftProps) {
  const { state, meta } = useComposer();

  // Don't render in question mode
  if (state.mode === "question") return null;

  return (
    <div className={cn("absolute bottom-3 left-3 flex items-center gap-2", className)}>
      {/* Model selector */}
      <button
        type="button"
        onClick={onModelClick}
        disabled={meta.isProcessing}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap",
          "focus-visible:outline-none focus-visible:ring-none",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0",
          "text-foreground/90 hover:bg-muted hover:text-foreground",
          "font-medium h-7 px-2.5 text-xs gap-1.5 rounded-md transition-colors"
        )}
      >
        <ClaudeIcon className="size-3" />
        <span>{modelName}</span>
      </button>

      {/* Thinking toggle */}
      <Toggle
        pressed={thinkingEnabled}
        onPressedChange={onThinkingToggle}
        aria-label="Toggle thinking mode"
      >
        <Brain strokeWidth={1.5} />
        {thinkingEnabled && (
          <span className="text-xs font-medium whitespace-nowrap">Thinking</span>
        )}
      </Toggle>

      {/* Plan toggle */}
      <Toggle
        pressed={planEnabled}
        onPressedChange={onPlanToggle}
        aria-label="Toggle plan mode"
      >
        <MapIcon strokeWidth={1.5} />
      </Toggle>
    </div>
  );
}

interface ToolbarRightProps {
  onAddClick?: () => void;
  onStop?: () => void;
  className?: string;
}

function ToolbarRight({ onAddClick, onStop, className }: ToolbarRightProps) {
  const { state, actions, meta } = useComposer();

  // Don't render in question mode
  if (state.mode === "question") return null;

  return (
    <div className={cn("absolute bottom-3 right-3 flex items-center gap-2 flex-shrink-0 h-7", className)}>
      {meta.isProcessing && state.prompt.trim() && (
        <span className="text-xs text-amber-600 dark:text-amber-400">Waiting...</span>
      )}

      {/* Stop button (when processing) */}
      {meta.isProcessing && onStop && (
        <button
          type="button"
          onClick={onStop}
          className={cn(
            "inline-flex items-center justify-center h-7 px-2.5 text-xs rounded-md transition-colors",
            "text-destructive hover:text-destructive hover:bg-destructive/10"
          )}
          title="Stop"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={onAddClick}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap",
          "focus-visible:outline-none focus-visible:ring-none",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0",
          "h-7 px-2.5 text-xs rounded-md transition-colors",
          "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Plus className="size-4" strokeWidth={1.5} />
      </button>

      {/* Submit button */}
      <button
        type="button"
        onClick={actions.submitPrompt}
        disabled={!meta.canSubmitPrompt}
        className={cn(
          "inline-flex items-center justify-center",
          "focus-visible:outline-none focus-visible:ring-none",
          "disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:pointer-events-none",
          "h-6 w-6 rounded-sm transition-colors",
          meta.canSubmitPrompt
            ? "bg-foreground hover:bg-foreground/80"
            : "bg-muted cursor-not-allowed"
        )}
        title="Send"
      >
        <ArrowUp className="size-4 text-background" strokeWidth={1.5} />
      </button>
    </div>
  );
}

// Legacy SubmitButton for backwards compatibility
interface SubmitButtonProps {
  onStop?: () => void;
  className?: string;
}

function SubmitButton({ onStop, className }: SubmitButtonProps) {
  return <ToolbarRight onStop={onStop} className={className} />;
}

// ============================================================================
// Content Slot (switches between modes)
// ============================================================================

interface ContentSlotProps {
  className?: string;
}

function ContentSlot({ className }: ContentSlotProps) {
  const { state } = useComposer();

  return (
    <div className={cn("relative", className)}>
      {state.mode === "typing" && <Textarea />}
      {state.mode === "question" && <QuestionContent />}
    </div>
  );
}

// ============================================================================
// Export compound component
// ============================================================================

export const Composer = {
  Root: ComposerRoot,
  ContentSlot,
  Textarea,
  QuestionContent,
  Footer,
  ToolbarLeft,
  ToolbarRight,
  SubmitButton, // Deprecated, use ToolbarRight
};

export { useComposer };
export type { PendingQuestion, ComposerMode };
