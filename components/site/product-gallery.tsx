'use client';

import { useState } from 'react';

type GImg = { src: string; alt?: string };

export function ProductGallery({ images, name }: { images: GImg[]; name: string }) {
  const [active, setActive] = useState(0);
  const imgs = images.length ? images : [];
  const main = imgs[active];

  return (
    <div className="lg:sticky lg:top-24">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-6">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main.src}
            alt={main.alt || name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-muted-fg)]">
            ไม่มีรูปสินค้า
          </div>
        )}
      </div>

      {imgs.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-6">
          {imgs.slice(0, 12).map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`ดูรูปที่ ${i + 1}`}
              aria-pressed={i === active}
              className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-white p-1.5 transition-all duration-200 ${
                i === active
                  ? 'border-[var(--color-brand-500)] ring-2 ring-[var(--color-brand-500)]/30'
                  : 'border-[var(--color-border)] hover:border-[var(--color-brand-500)]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt || `${name} ${i + 1}`} className="max-h-full max-w-full object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
