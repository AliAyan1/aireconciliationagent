export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-card mb-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-card border border-default" />
        ))}
      </div>
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-lg bg-card" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-xl bg-card border border-default" />
    </div>
  );
}
