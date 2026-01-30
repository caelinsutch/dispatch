import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

// Pre-composed skeleton patterns
export function SessionItemSkeleton() {
  return (
    <div className="px-4 py-2.5 border-l-2 border-l-transparent">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <div className="flex items-center gap-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SessionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <SessionItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("p-4", isUser ? "bg-accent-muted ml-8" : "bg-card")}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        {!isUser && <Skeleton className="h-4 w-4/6" />}
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-2">
      <MessageSkeleton isUser />
      <MessageSkeleton />
      <MessageSkeleton isUser />
      <MessageSkeleton />
    </div>
  );
}

export function ToolCallSkeleton() {
  return (
    <div className="border border-border-muted rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32 ml-auto" />
      </div>
    </div>
  );
}

export function RightSidebarSkeleton() {
  return (
    <aside className="w-80 border-l border-border-muted overflow-y-auto hidden lg:block">
      {/* Participants skeleton */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border-muted">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Metadata skeleton */}
      <div className="px-4 py-4 border-b border-border-muted">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tasks skeleton */}
      <div className="px-4 py-4">
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="h-12 px-4 flex items-center justify-between border-b border-border-muted flex-shrink-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-4 w-16" />
    </header>
  );
}
