import clsx from 'clsx';

interface SkeletonProps { className?: string; }

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={clsx('skeleton rounded-lg', className)} />
);

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
    <Skeleton className="h-3 w-3/5" />
    <Skeleton className="h-2.5 w-2/5" />
    <Skeleton className="h-2.5 w-4/5" />
  </div>
);

export const SkeletonList = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
