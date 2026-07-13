import { Skeleton } from '@/components/ui/skeleton';

export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Skeleton className="h-9 w-48" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
