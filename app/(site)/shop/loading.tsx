import { ProductGridSkeleton, SidebarSkeleton } from '@/components/site/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Skeleton className="h-9 w-56" />
      <div className="mt-10 grid gap-8 md:grid-cols-[240px_1fr] lg:gap-10">
        <SidebarSkeleton />
        <ProductGridSkeleton count={8} className="grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-4" />
      </div>
    </div>
  );
}
