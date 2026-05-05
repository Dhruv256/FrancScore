export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-bg-card" />
          <div className="h-4 w-32 rounded bg-bg-card" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 rounded-full bg-bg-card" />
          <div className="h-10 w-24 rounded-full bg-bg-card" />
        </div>
      </div>

      {/* Readiness score skeleton */}
      <div className="card h-32 bg-bg-card" />

      {/* Skill progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 bg-bg-card" />
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="h-5 w-32 rounded bg-bg-card" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-16 bg-bg-card" />
          ))}
        </div>
        <div className="card h-64 bg-bg-card" />
      </div>
    </div>
  );
}
