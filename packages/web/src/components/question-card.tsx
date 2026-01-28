"use client";

import { memo, useState } from "react";

interface QuestionOption {
  label: string;
  description?: string;
}

interface QuestionInfo {
  question: string;
  header?: string;
  options: QuestionOption[];
  multiple?: boolean;
  custom?: boolean;
}

interface QuestionCardProps {
  requestId: string;
  questions: QuestionInfo[];
  onAnswer: (requestId: string, answers: string[][]) => void;
  onDismiss?: () => void;
}

export const QuestionCard = memo(function QuestionCard({
  requestId,
  questions,
  onAnswer,
  onDismiss,
}: QuestionCardProps) {
  const [selections, setSelections] = useState<Map<number, Set<string>>>(new Map());
  const [customInputs, setCustomInputs] = useState<Map<number, string>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionToggle = (qIndex: number, label: string, multiple: boolean) => {
    setSelections((prev) => {
      const newSelections = new Map(prev);
      const current = new Set(newSelections.get(qIndex) || []);

      if (multiple) {
        if (current.has(label)) current.delete(label);
        else current.add(label);
      } else {
        current.clear();
        current.add(label);
      }

      newSelections.set(qIndex, current);
      return newSelections;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const answers: string[][] = questions.map((_, idx) => {
      const selected = selections.get(idx) || new Set();
      const custom = customInputs.get(idx);
      const result = Array.from(selected);
      if (custom?.trim()) result.push(custom.trim());
      return result;
    });
    await onAnswer(requestId, answers);
    // Don't reset isSubmitting - component will be replaced by AnsweredQuestion
    // Resetting it causes a flicker where button briefly shows "Submit" again
  };

  const hasSelection = questions.some((_, idx) => {
    const selected = selections.get(idx);
    const custom = customInputs.get(idx);
    return (selected && selected.size > 0) || custom?.trim();
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden my-3 max-w-full">
      <div className="bg-muted px-4 py-3 flex items-center gap-3 border-b border-border-muted">
        <span className="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-bold">
          ?
        </span>
        <span className="font-semibold text-foreground">Question from AI</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            &times;
          </button>
        )}
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {questions.map((q, qIndex) => (
          <div
            key={`question-${q.header || qIndex}`}
            className="p-4 border-b border-border-muted last:border-b-0"
          >
            {q.header && (
              <div className="text-xs uppercase tracking-wide text-secondary-foreground mb-1">
                {q.header}
              </div>
            )}
            <div className="text-foreground mb-3">{q.question}</div>

            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = selections.get(qIndex)?.has(opt.label) || false;
                return (
                  <label
                    key={opt.label}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border ${
                      isSelected
                        ? "bg-accent-muted border-accent"
                        : "bg-muted border-border-muted hover:border-border"
                    }`}
                  >
                    <input
                      type={q.multiple ? "checkbox" : "radio"}
                      name={`question-${qIndex}`}
                      checked={isSelected}
                      onChange={() => handleOptionToggle(qIndex, opt.label, q.multiple || false)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 w-4 h-4 ${q.multiple ? "rounded-sm" : "rounded-full"} border-2 flex items-center justify-center ${
                        isSelected ? "border-accent bg-accent" : "border-secondary-foreground"
                      }`}
                    >
                      {isSelected &&
                        (q.multiple ? (
                          <CheckIcon />
                        ) : (
                          <span className="w-2 h-2 bg-white rounded-full" />
                        ))}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground font-medium">{opt.label}</div>
                      {opt.description && (
                        <div className="text-muted-foreground text-sm mt-0.5">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {q.custom !== false && (
              <input
                type="text"
                placeholder="Or type a custom answer..."
                value={customInputs.get(qIndex) || ""}
                onChange={(e) =>
                  setCustomInputs((prev) => new Map(prev).set(qIndex, e.target.value))
                }
                className="mt-3 w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-secondary-foreground focus:outline-none focus:border-accent"
              />
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-card border-t border-border-muted flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !hasSelection}
          className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
});

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <title>Check</title>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface AnsweredQuestionProps {
  questions: QuestionInfo[];
  answers: string[][];
}

export function AnsweredQuestion({ questions, answers }: AnsweredQuestionProps) {
  return (
    <div className="bg-card border border-success/50 rounded-lg overflow-hidden my-2">
      <div className="bg-success/20 px-4 py-2 flex items-center gap-2 border-b border-success/30">
        <span className="w-5 h-5 bg-success text-white rounded-full flex items-center justify-center text-xs font-bold">
          ✓
        </span>
        <span className="font-medium text-success text-sm">Question Answered</span>
      </div>

      <div className="p-3">
        {questions.map((q, qIndex) => (
          <div key={`answered-${q.header || qIndex}`} className="mb-2 last:mb-0">
            {q.header && (
              <div className="text-xs uppercase tracking-wide text-secondary-foreground mb-0.5">
                {q.header}
              </div>
            )}
            <div className="text-muted-foreground text-sm mb-1">{q.question}</div>
            <div className="flex flex-wrap gap-1.5">
              {answers[qIndex]?.length > 0 ? (
                answers[qIndex].map((answer) => (
                  <span
                    key={answer}
                    className="px-2 py-1 bg-success/20 text-success rounded text-xs font-medium"
                  >
                    {answer}
                  </span>
                ))
              ) : (
                <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                  No selection
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { QuestionInfo, QuestionOption };
