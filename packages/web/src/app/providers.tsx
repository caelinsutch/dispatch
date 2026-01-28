"use client";

// Better Auth doesn't require a session provider wrapper
// The useSession hook handles session state internally via the auth client
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
