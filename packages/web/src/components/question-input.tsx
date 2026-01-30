"use client";

import { ArrowUp, X } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { QuestionInfo } from "./question-card";

interface QuestionInputProps {
  requestId: string;
  questions: QuestionInfo[];
  onAnswer: (requestId: string, answers: string[][]) => void;
  onDismiss?: () => void;
}

export const QuestionInput = memo(function QuestionInput({
  requestId,
  questions,
  onAnswer,
  onDismiss,
}: QuestionInputProps) {
  // For simplicity, handle single question (most common case)
  const question = questions[0];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSelection = selectedIndex !== null || customInput.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!hasSelection || isSubmitting) return;
    setIsSubmitting(true);

    const answers: string[][] = [];
    if (customInput.trim()) {
      answers.push([customInput.trim()]);
    } else if (selectedIndex !== null && question?.options[selectedIndex]) {
      answers.push([question.options[selectedIndex].label]);
    }

    await onAnswer(requestId, answers);
  }, [hasSelection, isSubmitting, customInput, selectedIndex, question, onAnswer, requestId]);

  const handleOptionClick = useCallback((index: number) => {
    setSelectedIndex(index);
    setCustomInput(""); // Clear custom input when selecting an option
  }, []);

  const handleCustomInputChange = useCallback((value: string) => {
    setCustomInput(value);
    setSelectedIndex(null); // Clear selection when typing custom
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && hasSelection) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [hasSelection, handleSubmit]
  );

  if (!question) return null;

  return (
    <div className="mb-2 w-full border border-border rounded-sm bg-background">
      <div className="px-3 py-3">
        {/* Question text with dismiss button */}
        <div className="flex items-start gap-2">
          <div className="prose prose-sm prose-invert antialiased select-text text-pretty prose-headings:text-balance text-sm flex-1">
            <p>{question.question}</p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Options list */}
        <div className="mt-3 flex flex-col gap-0.5" role="listbox">
          {question.options.map((opt, idx) => (
            <div
              key={opt.label}
              role="option"
              aria-selected={selectedIndex === idx}
              tabIndex={0}
              onClick={() => handleOptionClick(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOptionClick(idx);
                }
              }}
              className={cn(
                "flex items-start gap-2 px-2 py-1.5 rounded-sm cursor-pointer transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                selectedIndex === idx ? "bg-muted" : "hover:bg-muted"
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
          ))}

          {/* Custom "Other" option */}
          {question.custom !== false && (
            <div className="flex items-start gap-2 px-2 py-1.5 rounded-sm transition-colors">
              <span
                className="w-4 text-xs text-muted-foreground shrink-0 mt-0.5"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                0
              </span>
              <textarea
                placeholder="Type something..."
                rows={1}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={customInput}
                onChange={(e) => handleCustomInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                style={{ minHeight: "1.25rem" }}
              />
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="flex items-center justify-between mt-3">
          <div />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasSelection || isSubmitting}
            className={cn(
              "inline-flex px-2 items-center gap-2 whitespace-nowrap ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-none",
              "disabled:pointer-events-none disabled:opacity-50",
              "[&_svg]:pointer-events-none text-foreground/90 hover:bg-sidebar-accent hover:text-accent-foreground",
              "font-450 h-6 w-6 [&_svg]:shrink-0 text-xs justify-center rounded-sm",
              hasSelection && !isSubmitting
                ? "bg-foreground cursor-pointer"
                : "bg-foreground/50 cursor-not-allowed"
            )}
          >
            <ArrowUp className="size-4 text-background" style={{ strokeWidth: 1.5 }} />
          </button>
        </div>
      </div>
    </div>
  );
});
