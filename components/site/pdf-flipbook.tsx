'use client';

import { useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';

// react-pageflip types mark every prop required; relax for ergonomic usage.
const FlipBook = HTMLFlipBook as unknown as React.ComponentType<any>;

type Props = { url: string; title?: string };

export function PdfFlipbook({ url, title }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [ratio, setRatio] = useState(1.414); // h/w (A4 default)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const bookRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const doc = await pdfjs.getDocument({ url }).promise;
        const imgs: string[] = [];
        let r = 1.414;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          imgs.push(canvas.toDataURL('image/jpeg', 0.82));
          if (i === 1) r = viewport.height / viewport.width;
        }
        if (cancelled) return;
        setRatio(r);
        setPages(imgs);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (status === 'loading') {
    return (
      <div className="flex h-[520px] w-full animate-pulse items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] text-sm text-[var(--color-muted-fg)]">
        กำลังโหลดแคตตาล็อก…
      </div>
    );
  }

  // Fallback: native PDF embed if flipbook rendering failed
  if (status === 'error' || pages.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]">
        <iframe src={`${url}#view=FitH`} title={title || 'แคตตาล็อก'} className="h-[560px] w-full md:h-[760px]" loading="lazy" />
      </div>
    );
  }

  const baseW = 440;
  const baseH = Math.round(baseW * ratio);

  return (
    <div className="flex flex-col items-center">
      <div className="w-full overflow-x-auto">
        <div className="mx-auto flex justify-center py-2" style={{ minWidth: baseW }}>
          <FlipBook
            ref={bookRef}
            width={baseW}
            height={baseH}
            size="stretch"
            minWidth={300}
            maxWidth={560}
            minHeight={Math.round(300 * ratio)}
            maxHeight={Math.round(560 * ratio)}
            showCover
            mobileScrollSupport
            maxShadowOpacity={0.3}
            flippingTime={600}
            className="shadow-lg"
          >
            {pages.map((src, i) => (
              <div key={i} className="overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${title || 'แคตตาล็อก'} หน้า ${i + 1}`} className="h-full w-full object-contain" />
              </div>
            ))}
          </FlipBook>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-[var(--color-muted-fg)]">
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip?.()?.flipPrev?.()}
          className="rounded-full border border-[var(--color-border)] px-4 py-1.5 font-medium text-[var(--color-brand-500)] transition-colors hover:bg-[var(--color-brand-50)]"
        >
          ← ก่อนหน้า
        </button>
        <span>คลิกมุมหน้าเพื่อพลิก · {pages.length} หน้า</span>
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip?.()?.flipNext?.()}
          className="rounded-full border border-[var(--color-border)] px-4 py-1.5 font-medium text-[var(--color-brand-500)] transition-colors hover:bg-[var(--color-brand-50)]"
        >
          ถัดไป →
        </button>
      </div>
    </div>
  );
}
