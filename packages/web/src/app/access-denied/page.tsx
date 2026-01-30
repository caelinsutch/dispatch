"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // NextAuth passes error=AccessDenied when signIn callback returns false
  const message =
    error === "AccessDenied"
      ? "Your account is not authorized to use this application."
      : "An error occurred during sign in. Please try again.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold text-foreground">Access Denied</h1>
      <Alert variant="error" className="max-w-md text-center">
        {message}
      </Alert>
      <a href="/" className="text-accent hover:underline">
        Return to homepage
      </a>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <AccessDeniedContent />
    </Suspense>
  );
}
