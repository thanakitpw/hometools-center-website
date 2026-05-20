import type { StaticPage } from '@/lib/static-pages';

export function PageRenderer({ page }: { page: StaticPage }) {
  return (
    <div className="prose prose-base max-w-none text-[var(--color-body)]">
      {page.blocks.map((b, i) => {
        if (b.type === 'img') {
          return <img key={i} src={b.src} alt={b.alt || ''} loading="lazy" className="my-6 rounded-lg" />;
        }
        if (b.type === 'iframe') {
          return (
            <div key={i} className="my-6 aspect-video">
              <iframe src={b.src} className="h-full w-full rounded-lg border-0" loading="lazy" />
            </div>
          );
        }
        if (b.type === 'h1') return <h1 key={i} className="!text-[var(--color-fg)]">{b.text}</h1>;
        if (b.type === 'h2') return <h2 key={i} className="!text-[var(--color-brand-light)]">{b.text}</h2>;
        if (b.type === 'h3') return <h3 key={i}>{b.text}</h3>;
        if (b.type === 'h4') return <h4 key={i}>{b.text}</h4>;
        if (b.type === 'li') return <li key={i} className="ml-6 list-disc">{b.text}</li>;
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
