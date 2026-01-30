"use client";

import { Github } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use } from "react";
import { useSidebar } from "@/hooks/use-sidebar";
import { SessionsProvider } from "@/hooks/use-sessions";
import { authClient } from "@/lib/auth-client";
import { SessionSidebar } from "./session-sidebar";
import { Button } from "./ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable";
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

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const sidebar = useSidebar();

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

  const handleNewSession = () => {
    router.push("/session/new");
  };

  return (
    <SidebarContext.Provider value={sidebar}>
      <SessionsProvider isAuthenticated={!!session}>
        <div className="h-screen overflow-hidden">
          <ResizablePanelGroup orientation="horizontal" id="sidebar-layout">
            {/* Resizable Sidebar */}
            <ResizablePanel
              id="sidebar"
              defaultSize="20%"
              minSize="280px"
              maxSize="50%"
            >
              <SessionSidebar onNewSession={handleNewSession} onToggle={sidebar.toggle} />
            </ResizablePanel>
            <ResizableHandle />
            {/* Main Content */}
            <ResizablePanel id="main" defaultSize="80%" minSize="50%">
              <main className="h-full overflow-hidden">{children}</main>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SessionsProvider>
    </SidebarContext.Provider>
  );
}
