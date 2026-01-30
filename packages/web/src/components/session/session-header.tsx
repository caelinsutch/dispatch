import { PanelLeft } from "lucide-react";

interface SessionHeaderProps {
  title: string;
  repoOwner: string;
  repoName: string;
  showSidebarToggle: boolean;
  onToggleSidebar: () => void;
  children?: React.ReactNode;
}

export function SessionHeader({
  title,
  repoOwner,
  repoName,
  showSidebarToggle,
  onToggleSidebar,
  children,
}: SessionHeaderProps) {
  return (
    <header className="h-12 px-4 flex items-center justify-between border-b border-border-muted flex-shrink-0">
      <div className="flex items-center gap-3">
        {showSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h1 className="text-sm font-medium text-foreground">
            {title || `${repoOwner}/${repoName}`}
          </h1>
        </div>
      </div>
      {children}
    </header>
  );
}
