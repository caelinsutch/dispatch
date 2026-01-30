"use client";

import { Check, MessageSquareMore, Minus, X } from "lucide-react";
import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  QuestionCardContext,
  type QuestionInfo,
  type QuestionOption,
  useQuestionCard,
  useQuestionState,
} from "./context";

// Root component - provides context
interface QuestionCardRootProps {
  requestId: string;
  questions: QuestionInfo[];
  onAnswer: (requestId: string, answers: string[][]) => void;
  children: React.ReactNode;
}

function QuestionCardRoot({ requestId, questions, onAnswer, children }: QuestionCardRootProps) {
  const contextValue = useQuestionState(questions, async (answers) => {
    await onAnswer(requestId, answers);
  });

  return (
    <QuestionCardContext value={contextValue}>
      <div className="bg-card border border-border rounded-lg overflow-hidden my-3 max-w-full">
        {children}
      </div>
    </QuestionCardContext>
  );
}

// Header component
interface HeaderProps {
  onDismiss?: () => void;
}

function Header({ onDismiss }: HeaderProps) {
  return (
    <div className="bg-muted px-4 py-3 flex items-center gap-3 border-b border-border-muted">
      <span className="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-bold">
        ?
      </span>
      <span className="font-semibold text-foreground">Question from AI</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

// Questions container
function Questions({ children }: { children: React.ReactNode }) {
  return <div className="max-h-[60vh] overflow-y-auto">{children}</div>;
}

// Single question component
interface QuestionProps {
  index: number;
}

function Question({ index }: QuestionProps) {
  const { state, actions, meta } = useQuestionCard();
  const question = meta.questions[index];

  if (!question) return null;

  return (
    <div className="p-4 border-b border-border-muted last:border-b-0">
      {question.header && (
        <div className="text-xs uppercase tracking-wide text-secondary-foreground mb-1">
          {question.header}
        </div>
      )}
      <div className="text-foreground mb-3">{question.question}</div>

      <div className="space-y-2">
        {question.options.map((opt) => {
          const isSelected = state.selections.get(index)?.has(opt.label) || false;
          return (
            <label
              key={opt.label}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border",
                isSelected
                  ? "bg-accent-muted border-accent"
                  : "bg-muted border-border-muted hover:border-border"
              )}
            >
              <input
                type={question.multiple ? "checkbox" : "radio"}
                name={`question-${index}`}
                checked={isSelected}
                onChange={() => actions.toggleOption(index, opt.label, question.multiple || false)}
                className="sr-only"
              />
              <span
                className={cn(
                  "mt-0.5 w-4 h-4 border-2 flex items-center justify-center",
                  question.multiple ? "rounded-sm" : "rounded-full",
                  isSelected ? "border-accent bg-accent" : "border-secondary-foreground"
                )}
              >
                {isSelected &&
                  (question.multiple ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : (
                    <span className="w-2 h-2 bg-white rounded-full" />
                  ))}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-foreground font-medium">{opt.label}</div>
                {opt.description && (
                  <div className="text-muted-foreground text-sm mt-0.5">{opt.description}</div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {question.custom !== false && (
        <Input
          placeholder="Or type a custom answer..."
          value={state.customInputs.get(index) || ""}
          onChange={(e) => actions.setCustomInput(index, e.target.value)}
          className="mt-3"
        />
      )}
    </div>
  );
}

// Submit button
function Submit() {
  const { state, actions, meta } = useQuestionCard();

  return (
    <div className="px-4 py-3 bg-card border-t border-border-muted flex justify-end">
      <Button onClick={actions.submit} disabled={state.isSubmitting || !meta.hasSelection}>
        {state.isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </div>
  );
}

// Convenience component that composes all parts
const QuestionCardComposed = memo(function QuestionCardComposed({
  requestId,
  questions,
  onAnswer,
  onDismiss,
}: {
  requestId: string;
  questions: QuestionInfo[];
  onAnswer: (requestId: string, answers: string[][]) => void;
  onDismiss?: () => void;
}) {
  return (
    <QuestionCard.Root requestId={requestId} questions={questions} onAnswer={onAnswer}>
      <QuestionCard.Header onDismiss={onDismiss} />
      <QuestionCard.Questions>
        {questions.map((_, idx) => (
          <QuestionCard.Question key={idx} index={idx} />
        ))}
      </QuestionCard.Questions>
      <QuestionCard.Submit />
    </QuestionCard.Root>
  );
});

// Answered question display (standalone, not a compound component)
interface AnsweredQuestionProps {
  questions: QuestionInfo[];
  answers: string[][];
}

function AnsweredQuestion({ questions, answers }: AnsweredQuestionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Combine all answers for display
  const allAnswers = answers.flat().filter(Boolean);

  return (
    <div className="flex flex-col w-full max-w-xl lg:max-w-3xl space-y-1 break-words">
      <div className="w-full">
        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-2 py-1 group/collapsible max-w-full hover:bg-muted/50 cursor-pointer"
        >
          <div className="flex-shrink-0">
            <Minus className="size-3 text-muted-foreground hidden group-hover/collapsible:block" />
            <div className="group-hover/collapsible:hidden">
              <MessageSquareMore className="text-muted-foreground size-3" />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="text-sm truncate">
              <span>User input</span>
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-2 font-mono text-xs whitespace-pre-wrap break-words text-foreground bg-muted p-3 rounded-md border border-border">
            <div className="space-y-3 text-xs">
              {questions.map((q, qIndex) => (
                <div key={`answered-${q.header || qIndex}`}>
                  {/* Question as muted quote */}
                  <div className="border-l-2 border-muted-foreground/30 pl-2 text-muted-foreground">
                    {q.question}
                  </div>
                  {/* Answer */}
                  {answers[qIndex]?.length > 0 && (
                    <div className="font-medium mt-1">{answers[qIndex].join(", ")}</div>
                  )}
                </div>
              ))}
              {/* If only one question, show answers directly */}
              {questions.length === 1 && allAnswers.length > 0 && !answers[0]?.length && (
                <div className="font-medium">{allAnswers.join(", ")}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Create the QuestionCard component with compound component properties
// This allows both <QuestionCard requestId={...} /> and <QuestionCard.Root>...</QuestionCard.Root>
type QuestionCardComponent = typeof QuestionCardComposed & {
  Root: typeof QuestionCardRoot;
  Header: typeof Header;
  Questions: typeof Questions;
  Question: typeof Question;
  Submit: typeof Submit;
};

export const QuestionCard = QuestionCardComposed as QuestionCardComponent;
QuestionCard.Root = QuestionCardRoot;
QuestionCard.Header = Header;
QuestionCard.Questions = Questions;
QuestionCard.Question = Question;
QuestionCard.Submit = Submit;

export { AnsweredQuestion };

// Type exports
export type { QuestionInfo, QuestionOption };
