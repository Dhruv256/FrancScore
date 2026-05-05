export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-brand-green/20 border-t-brand-green animate-spin" />
        </div>
        <p className="text-sm text-text-muted animate-pulse">Loading FrancScore…</p>
      </div>
    </div>
  );
}
