export default function PracticeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 rounded-lg bg-bg-card" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-40 bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
