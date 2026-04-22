interface AnimeGridSkeletonProps {
  count?: number
  columns?: string
}

export default function AnimeGridSkeleton({
  count = 8,
  columns = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6',
}: AnimeGridSkeletonProps) {
  return (
    <div className={columns}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-gray-800 bg-card/70 p-3"
        >
          <div className="aspect-[3/4] rounded-xl bg-gray-800" />
          <div className="mt-3 h-4 w-3/4 rounded bg-gray-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-800" />
        </div>
      ))}
    </div>
  )
}
