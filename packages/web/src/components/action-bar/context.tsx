"use client";

import { createContext, use } from "react";
import type { Artifact } from "@/types/session";

export interface ActionBarContextValue {
  sessionId: string;
  isArchived: boolean;
  artifacts: Artifact[];
}

export const ActionBarContext = createContext<ActionBarContextValue | null>(null);

export function useActionBar() {
  const context = use(ActionBarContext);
  if (!context) {
    throw new Error("ActionBar components must be used within ActionBar.Root");
  }
  return context;
}
