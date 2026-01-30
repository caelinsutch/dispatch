"use client";

import { Github } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use } from "react";
import { useSidebar } from "@/hooks/use-sidebar";
import { authClient } from "@/lib/auth-client";
import { SessionSidebar } from "./session-sidebar";
import { Button } from "./ui/button";
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
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar with transition */}
        <div
          className={`transition-all duration-200 ease-in-out ${
            sidebar.isOpen ? "w-72" : "w-0"
          } flex-shrink-0 overflow-hidden`}
        >
          <SessionSidebar onNewSession={handleNewSession} onToggle={sidebar.toggle} />
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </SidebarContext.Provider>
  );
}
