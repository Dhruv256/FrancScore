export default function PracticeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 rounded-lg bg-bg-card" />
      <div className="card h-32 bg-bg-card" />
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
