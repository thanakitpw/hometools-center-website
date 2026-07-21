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
      className="group flex flex-col overflow-hidden border border-[#e5e5e5] bg-white transition-shadow hover:shadow-md"
    >
      {/*
        `cover` so the image fills the frame edge-to-edge like the old site, instead of
        letterboxing, with `object-top` so whatever is cropped is the footer rather than
        the title and product shot.

        The frame is 4:5 because the card is meant to read tall. Note the catalog is
        ~80% square art and ~20% portrait A4 covers, so a *square* frame is what
        actually minimises cropping (5.8% weighted, vs 18.3% here) — the extra height
        is a deliberate look, not a free win.
      */}
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-white">
        {img ? (
          <img
            src={img}
            alt={p.images?.[0]?.alt || p.name_th}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-fg)]">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center px-4 pb-6 pt-5 text-center">
        <h3 className="line-clamp-2 min-h-[36px] text-[13px] font-semibold leading-snug text-[#333333] group-hover:text-[var(--color-brand-500)]">
          {p.name_th}
        </h3>
        <span className="mt-auto inline-flex h-9 w-full max-w-[210px] items-center justify-center rounded-full bg-[#0875d1] px-6 text-[13px] font-semibold uppercase tracking-[0.2px] text-white transition-colors group-hover:bg-[#005fae]">
          VIEW MORE
        </span>
      </div>
    </Link>
  );
}
