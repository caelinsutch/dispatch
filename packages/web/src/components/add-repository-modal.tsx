"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionsContext } from "@/hooks/use-sessions";

interface Repo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  private: boolean;
}

interface AddRepositoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRepositoryModal({ open, onOpenChange }: AddRepositoryModalProps) {
  const router = useRouter();
  const { createSession } = useSessionsContext();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetchRepos();
    }
  }, [open]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/repos");
      if (res.ok) {
        const data = (await res.json()) as { repos?: Repo[] };
        setRepos(data.repos || []);
      }
    } catch (err) {
      console.error("Failed to fetch repos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedRepo) {
      setError("Please select a repository");
      return;
    }

    setCreating(true);
    setError("");

    const [owner, name] = selectedRepo.split("/");
    const result = await createSession(owner, name);

    if (result.success && result.sessionId) {
      onOpenChange(false);
      setSelectedRepo(null);
      router.push(`/session/${result.sessionId}`);
    } else {
      setError(result.error || "Failed to create session");
    }

    setCreating(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedRepo(null);
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Add Repository</DialogTitle>
            <DialogDescription>
              Select a repository to create a new workspace session.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {error && (
              <Alert variant="error" className="mb-4" onDismiss={() => setError("")}>
                {error}
              </Alert>
            )}

            <Select value={selectedRepo} onValueChange={setSelectedRepo} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Loading..." : "Select a repository..."} />
              </SelectTrigger>
              <SelectContent>
                {repos.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No repositories found
                  </div>
                ) : (
                  repos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.fullName}>
                      {repo.fullName} {repo.private ? "(private)" : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {repos.length === 0 && !loading && (
              <p className="mt-2 text-sm text-muted-foreground">
                No repositories found. Make sure you have granted access to your repositories.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !selectedRepo || loading}>
              {creating ? "Creating..." : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
