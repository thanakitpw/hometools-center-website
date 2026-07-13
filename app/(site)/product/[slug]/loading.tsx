import { BreadcrumbSkeleton } from '@/components/site/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <BreadcrumbSkeleton />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* gallery */}
        <div>
          <Skeleton className="aspect-square w-full" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>

        {/* detail */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-11/12" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-4 h-11 w-56 rounded-full" />
        </div>
      </div>
    </div>
  );
}
