import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

const Skeleton = ({ className = '', height, width, rounded = 'rounded-lg' }: SkeletonProps) => (
  <div
    className={clsx('animate-pulse bg-gray-200', rounded, className)}
    style={{ height, width }}
  />
);

export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-8 w-full" />
  </div>
);

interface SkeletonListProps {
  count?: number;
}

export const SkeletonList = ({ count = 3 }: SkeletonListProps) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
