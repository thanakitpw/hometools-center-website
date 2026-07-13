import { BreadcrumbSkeleton, ProductGridSkeleton, SidebarSkeleton } from '@/components/site/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <BreadcrumbSkeleton />
      <Skeleton className="mt-6 h-9 w-72" />
      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <SidebarSkeleton />
        <div>
          <Skeleton className="h-4 w-40" />
          <ProductGridSkeleton
            count={8}
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          />
        </div>
      </div>
    </div>
  );
}
