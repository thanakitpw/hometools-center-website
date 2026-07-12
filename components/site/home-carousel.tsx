'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  images: string[];
  alt?: string;
  /** aspect ratio as width/height, e.g. 1366/420 for hero */
  ratio?: number;
  rounded?: boolean;
  interval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  objectFit?: 'cover' | 'contain';
};

export function HomeCarousel({
  images,
  alt = '',
  ratio,
  rounded = false,
  interval = 5000,
  showArrows = true,
  showDots = false,
  objectFit = 'cover',
}: Props) {
  const [i, setI] = useState(0);
  const n = images.length;
  const go = useCallback((d: number) => setI((p) => (p + d + n) % n), [n]);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), interval);
    return () => clearInterval(t);
  }, [n, interval]);

  return (
    <div
      className={`group relative w-full overflow-hidden ${rounded ? 'rounded-xl' : ''}`}
      style={ratio ? { aspectRatio: String(ratio) } : undefined}
    >
      {images.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${objectFit === 'cover' ? 'object-cover' : 'object-contain'} ${idx === i ? 'opacity-100' : 'opacity-0'}`}
          loading={idx === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {showArrows && n > 1 && (
        <>
          <button
            type="button"
            aria-label="ก่อนหน้า"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-slate-700 opacity-0 shadow transition group-hover:opacity-100 hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="ถัดไป"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-slate-700 opacity-0 shadow transition group-hover:opacity-100 hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {showDots && n > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`สไลด์ ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-2.5 w-2.5 rounded-full transition ${idx === i ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
