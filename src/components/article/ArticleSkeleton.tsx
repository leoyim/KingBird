export function ArticleSkeleton() {
  return (
    <div className="px-4 py-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3 w-16 rounded bg-black/5 dark:bg-white/5" />
        <div className="h-3 w-12 rounded bg-black/5 dark:bg-white/5" />
      </div>
      <div className="h-4 w-full rounded bg-black/5 dark:bg-white/5 mb-1.5" />
      <div className="h-4 w-3/4 rounded bg-black/5 dark:bg-white/5 mb-2" />
      <div className="h-3 w-full rounded bg-black/5 dark:bg-white/5" />
      <div className="h-3 w-2/3 rounded bg-black/5 dark:bg-white/5 mt-1" />
    </div>
  );
}
