"use client";

import { createContext, use, useCallback, useState } from "react";

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface QuestionInfo {
  question: string;
  header?: string;
  options: QuestionOption[];
  multiple?: boolean;
  custom?: boolean;
}

export interface QuestionCardState {
  selections: Map<number, Set<string>>;
  customInputs: Map<number, string>;
  isSubmitting: boolean;
}

export interface QuestionCardActions {
  toggleOption: (qIndex: number, label: string, multiple: boolean) => void;
  setCustomInput: (qIndex: number, value: string) => void;
  submit: () => Promise<void>;
}

export interface QuestionCardMeta {
  questions: QuestionInfo[];
  hasSelection: boolean;
}

export interface QuestionCardContextValue {
  state: QuestionCardState;
  actions: QuestionCardActions;
  meta: QuestionCardMeta;
}

export const QuestionCardContext = createContext<QuestionCardContextValue | null>(null);

export function useQuestionCard() {
  const context = use(QuestionCardContext);
  if (!context) {
    throw new Error("QuestionCard components must be used within QuestionCard.Root");
  }
  return context;
}

export function useQuestionState(
  questions: QuestionInfo[],
  onAnswer: (answers: string[][]) => Promise<void>
): QuestionCardContextValue {
  const [selections, setSelections] = useState<Map<number, Set<string>>>(new Map());
  const [customInputs, setCustomInputs] = useState<Map<number, string>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleOption = useCallback((qIndex: number, label: string, multiple: boolean) => {
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
  }, []);

  const setCustomInput = useCallback((qIndex: number, value: string) => {
    setCustomInputs((prev) => new Map(prev).set(qIndex, value));
  }, []);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    const answers: string[][] = questions.map((_, idx) => {
      const selected = selections.get(idx) || new Set();
      const custom = customInputs.get(idx);
      const result = Array.from(selected);
      if (custom?.trim()) result.push(custom.trim());
      return result;
    });
    await onAnswer(answers);
    // Don't reset isSubmitting - component will be replaced by AnsweredQuestion
  }, [questions, selections, customInputs, onAnswer]);

  const hasSelection = questions.some((_, idx) => {
    const selected = selections.get(idx);
    const custom = customInputs.get(idx);
    return (selected && selected.size > 0) || custom?.trim();
  });

  return {
    state: { selections, customInputs, isSubmitting },
    actions: { toggleOption, setCustomInput, submit },
    meta: { questions, hasSelection },
  };
}
