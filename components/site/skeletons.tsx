import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors ProductCard's box model exactly (full-bleed 4:5 image / title 36 /
 * button h-9). A skeleton whose size differs from the content that replaces it
 * causes the layout shift it was meant to prevent.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden border border-[#e5e5e5] bg-white">
      <div className="aspect-[4/5]">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-3 px-4 pb-6 pt-5">
        <Skeleton className="h-[13px] w-4/5" />
        <Skeleton className="h-[13px] w-3/5" />
        <Skeleton className="mt-auto h-9 w-full max-w-[210px] rounded-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BlogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
          <Skeleton className="aspect-[1200/630] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Category list rail on shop / category pages. */
export function SidebarSkeleton() {
  return (
    <div className="hidden md:block">
      <Skeleton className="h-5 w-32" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-3" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-3" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}
