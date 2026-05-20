import Link from 'next/link';

type CardProduct = {
  slug: string;
  name_th: string;
  images?: Array<{ src: string; alt?: string }> | null;
  short_description?: string | null;
};

export function ProductCard({ p }: { p: CardProduct }) {
  const img = p.images?.[0]?.src;
  return (
    <Link
      href={`/product/${p.slug}` as any}
      className="group flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-white transition-shadow hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-[var(--color-muted)]">
        {img ? (
          <img
            src={img}
            alt={p.images?.[0]?.alt || p.name_th}
            loading="lazy"
            className="h-full w-full object-contain transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-fg)]">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-[var(--color-fg)] group-hover:text-[var(--color-brand-500)]">
          {p.name_th}
        </h3>
        <span className="mt-auto pt-3 text-xs font-medium text-[var(--color-brand-500)]">
          ดูรายละเอียด →
        </span>
      </div>
    </Link>
  );
}
