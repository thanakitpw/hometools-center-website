import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  totalPages,
  baseUrl,
}: {
  page: number;
  totalPages: number;
  baseUrl: string;
}) {
  if (totalPages <= 1) return null;
  const url = (p: number) => {
    if (p === 1) return baseUrl;
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${p}`;
  };
  const pages: Array<number | '...'> = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return (
    <nav className="mt-8 flex items-center justify-center gap-1 text-sm">
      {page > 1 && (
        <Link href={url(page - 1) as any} className="flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-muted)]">
          <ChevronLeft className="h-4 w-4" /> Prev
        </Link>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={i} className="px-2 text-[var(--color-muted-fg)]">…</span>
        ) : (
          <Link
            key={i}
            href={url(p) as any}
            className={cn(
              'min-w-[2rem] rounded border px-2 py-1.5 text-center',
              p === page
                ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-white'
                : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'
            )}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link href={url(page + 1) as any} className="flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-muted)]">
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
