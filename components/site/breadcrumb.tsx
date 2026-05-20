import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-muted-fg)]">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {it.href ? (
              <Link href={it.href as any} className="hover:text-[var(--color-brand-500)]">
                {it.label}
              </Link>
            ) : (
              <span className="text-[var(--color-fg)]">{it.label}</span>
            )}
            {i < items.length - 1 && <ChevronRight className="h-3 w-3" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
