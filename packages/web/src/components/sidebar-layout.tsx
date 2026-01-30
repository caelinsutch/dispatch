"use client";

import { Github } from "lucide-react";
import { createContext, use, useCallback, useState } from "react";
import { SessionsProvider } from "@/hooks/use-sessions";
import { useSidebar } from "@/hooks/use-sidebar";
import { authClient } from "@/lib/auth-client";
import { SessionSidebar } from "./session-sidebar";
import { Button } from "./ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { Spinner } from "./ui/spinner";

interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebarContext() {
  const context = use(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarLayout");
  }
  return context;
}

// Context for right panel content
interface RightPanelContextValue {
  rightPanelContent: React.ReactNode | null;
  setRightPanelContent: (content: React.ReactNode | null) => void;
}

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

export function useRightPanelContext() {
  const context = use(RightPanelContext);
  if (!context) {
    throw new Error("useRightPanelContext must be used within a SidebarLayout");
  }
  return context;
}

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { data: session, isPending } = authClient.useSession();
  const sidebar = useSidebar();
  const [rightPanelContent, setRightPanelContent] = useState<React.ReactNode | null>(null);

  const setRightPanel = useCallback((content: React.ReactNode | null) => {
    setRightPanelContent(content);
  }, []);

  // Show loading state
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show sign-in page if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold text-foreground">Modal Sandbox</h1>
        <p className="text-muted-foreground max-w-md text-center">
          Background coding agent for your team. Ship faster with AI-powered code changes.
        </p>
        <Button size="lg" onClick={() => authClient.signIn.social({ provider: "github" })}>
          <Github className="h-5 w-5" />
          Sign in with GitHub
        </Button>
      </div>
    );
  }

  return (
    <SidebarContext.Provider value={sidebar}>
      <RightPanelContext.Provider
        value={{ rightPanelContent, setRightPanelContent: setRightPanel }}
      >
        <SessionsProvider isAuthenticated={!!session}>
          <div className="h-screen overflow-hidden">
            <ResizablePanelGroup orientation="horizontal" id="sidebar-layout">
              {/* Left Sidebar - Workspaces */}
              <ResizablePanel id="sidebar" defaultSize={20} minSize="240px" maxSize="400px">
                <SessionSidebar onToggle={sidebar.toggle} />
              </ResizablePanel>

              <ResizableHandle />

              {/* Center - Main Content (Messages/Chat) */}
              <ResizablePanel id="main" defaultSize={rightPanelContent ? 50 : 80} minSize="400px">
                <main className="h-full overflow-hidden">{children}</main>
              </ResizablePanel>

              {/* Right Panel - Actions/Changes/Files/Terminal */}
              {rightPanelContent && (
                <>
                  <ResizableHandle />
                  <ResizablePanel id="right-panel" defaultSize={30} minSize="280px" maxSize="500px">
                    {rightPanelContent}
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </SessionsProvider>
      </RightPanelContext.Provider>
    </SidebarContext.Provider>
  );
}
