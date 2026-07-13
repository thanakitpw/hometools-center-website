import { BreadcrumbSkeleton } from '@/components/site/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function BlogPostLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <BreadcrumbSkeleton />

      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>

      <Skeleton className="mt-6 aspect-[16/9] w-full rounded-lg" />

      <div className="mt-8 flex flex-col gap-3">
        {['100%', '96%', '98%', '90%', '100%', '94%', '70%'].map((width, i) => (
          <Skeleton key={i} className="h-4" style={{ width }} />
        ))}
      </div>
    </div>
  );
}
