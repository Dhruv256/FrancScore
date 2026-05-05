"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-accent-rose" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-text-secondary">
              FrancScore hit an unexpected error. Your progress is safe — please try refreshing.
            </p>
            {error.digest && (
              <p className="text-xs text-text-muted mt-2 font-mono">Error ID: {error.digest}</p>
            )}
          </div>
          <button
            onClick={reset}
            className="btn btn-primary inline-flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a href="/dashboard" className="block text-xs text-text-muted hover:text-text-secondary">
            ← Back to Dashboard
          </a>
        </div>
      </body>
    </html>
  );
}
