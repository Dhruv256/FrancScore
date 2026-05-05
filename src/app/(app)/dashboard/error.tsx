"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-accent-rose" />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Dashboard failed to load</h2>
        <p className="text-sm text-text-secondary max-w-xs">
          We could not retrieve your stats right now. Your progress is safe — please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-text-muted mt-2 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button onClick={reset} className="btn btn-primary flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}
