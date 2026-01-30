"use client";

import { DEFAULT_MODEL } from "@dispatch/shared";
import { PanelLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSidebarContext } from "@/components/sidebar-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

interface Repo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  private: boolean;
}

export default function NewSessionPage() {
  const { data: session, isPending } = authClient.useSession();
  const { isOpen, toggle } = useSidebarContext();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [isPending, session, router]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/repos");
      if (res.ok) {
        const data = (await res.json()) as { repos?: typeof repos };
        setRepos(data.repos || []);
      } else {
        toast.error("Failed to load repositories");
      }
    } catch (error) {
      console.error("Failed to fetch repos:", error);
      toast.error("Failed to load repositories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRepos();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) {
      setError("Please select a repository");
      return;
    }

    setCreating(true);
    setError("");

    const [owner, name] = selectedRepo.split("/");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: owner,
          repoName: name,
          model: DEFAULT_MODEL,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { sessionId: string };
        toast.success("Session created");
        router.push(`/session/${data.sessionId}`);
      } else {
        const data = (await res.json()) as { error?: string };
        const errorMsg = data.error || "Failed to create session";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (_error) {
      setError("Failed to create session");
      toast.error("Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with toggle when sidebar is closed */}
      {!isOpen && (
        <header className="border-b border-border-muted flex-shrink-0">
          <div className="px-4 py-3 flex items-center gap-3">
            <IconButton onClick={toggle} title="Open sidebar">
              <PanelLeft />
            </IconButton>
            <h1 className="text-lg font-semibold text-foreground">New Session</h1>
          </div>
        </header>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {isOpen && <h1 className="text-2xl font-bold text-foreground mb-8">New Session</h1>}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error" onDismiss={() => setError("")}>
                {error}
              </Alert>
            )}

            <div>
              <label
                htmlFor="repo-select"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Repository
              </label>
              <select
                id="repo-select"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full px-4 py-3 border border-border bg-input text-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 rounded-md"
                required
              >
                <option value="">Select a repository...</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.fullName} className="text-foreground bg-input">
                    {repo.fullName} {repo.private ? "(private)" : ""}
                  </option>
                ))}
              </select>
              {repos.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  No repositories found. Make sure you have granted access to your repositories.
                </p>
              )}
            </div>

            <Button type="submit" disabled={creating || !selectedRepo} className="w-full">
              {creating ? "Creating..." : "Create Session"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
