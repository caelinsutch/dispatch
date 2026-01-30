"use client";

import { PanelLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { SidebarLayout, useSidebarContext } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

export default function Home() {
  const router = useRouter();

  return (
    <SidebarLayout>
      <HomeContent onNewSession={() => router.push("/session/new")} />
    </SidebarLayout>
  );
}

function HomeContent({ onNewSession }: { onNewSession: () => void }) {
  const { isOpen, toggle } = useSidebarContext();

  return (
    <div className="h-full flex flex-col">
      {/* Header with toggle when sidebar is closed */}
      {!isOpen && (
        <header className="border-b border-border-muted flex-shrink-0">
          <div className="px-4 py-3">
            <IconButton onClick={toggle} title="Open sidebar">
              <PanelLeft />
            </IconButton>
          </div>
        </header>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-xl text-center">
          <h1 className="text-3xl font-semibold text-foreground mb-4">Welcome to Modal Sandbox</h1>
          <p className="text-muted-foreground mb-8">
            Select a session from the sidebar or create a new one to get started.
          </p>
          <Button size="lg" onClick={onNewSession}>
            <Plus className="h-5 w-5" />
            New Session
          </Button>
        </div>
      </div>
    </div>
  );
}
