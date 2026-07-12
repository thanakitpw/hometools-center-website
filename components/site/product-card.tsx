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
      className="group flex min-h-[330px] flex-col overflow-hidden border border-[#e5e5e5] bg-white transition-shadow hover:shadow-md"
    >
      <div className="flex h-[230px] items-center justify-center overflow-hidden bg-white">
        {img ? (
          <img
            src={img}
            alt={p.images?.[0]?.alt || p.name_th}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-fg)]">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center px-4 pb-6 pt-5 text-center">
        <h3 className="line-clamp-2 min-h-[44px] text-[16px] font-semibold leading-snug text-[#333333] group-hover:text-[var(--color-brand-500)]">
          {p.name_th}
        </h3>
        <span className="mt-auto inline-flex h-9 w-full max-w-[210px] items-center justify-center rounded-full bg-[#0875d1] px-6 text-[13px] font-semibold uppercase tracking-[0.2px] text-white transition-colors group-hover:bg-[#005fae]">
          VIEW MORE
        </span>
      </div>
    </Link>
  );
}
